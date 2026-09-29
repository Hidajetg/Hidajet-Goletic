import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase-admin";
import { verifySessionToken } from "../../../lib/admin-session";

export const runtime = "nodejs";

// ==========================================================
// PROVJERA ADMINA
// ==========================================================

async function getAdmin() {
  const cookieStore = await cookies();

  const token = cookieStore.get("solstone_session")?.value;

  const session = verifySessionToken(token);

  if (!session || session.role !== "admin") {
    return null;
  }

  return session;
}

// ==========================================================
// GET - SVI RADNICI
// ==========================================================

export async function GET() {
  try {
    const admin = await getAdmin();

    if (!admin) {
      return NextResponse.json(
        {
          error: "Keine Berechtigung.",
        },
        {
          status: 403,
        }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("workers")
      .select("id, name, role, active")
      .order("name", {
        ascending: true,
      });

    if (error) {
      throw error;
    }

    const safeWorkers = (data || []).map((worker: any) => ({
      id: String(worker.id),
      name: worker.name,
      role: worker.role || "worker",
      active: worker.active !== false,
    }));

    return NextResponse.json({
      workers: safeWorkers,
    });
  } catch (error: any) {
    console.error("GET WORKERS ERROR:", error);

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Mitarbeiter konnten nicht geladen werden.",
      },
      {
        status: 500,
      }
    );
  }
}

// ==========================================================
// POST - NOVI RADNIK
// ==========================================================

export async function POST(request: Request) {
  try {
    const admin = await getAdmin();

    if (!admin) {
      return NextResponse.json(
        {
          error: "Keine Berechtigung.",
        },
        {
          status: 403,
        }
      );
    }

    const body = await request.json();

    const name = String(body?.name || "").trim();
    const pin = String(body?.pin || "").trim();

    const role: "admin" | "worker" =
      body?.role === "admin" ? "admin" : "worker";

    // ------------------------------------------------------
    // PROVJERA IMENA
    // ------------------------------------------------------

    if (name.length < 2) {
      return NextResponse.json(
        {
          error: "Bitte Name eingeben.",
        },
        {
          status: 400,
        }
      );
    }

    // ------------------------------------------------------
    // PROVJERA PIN-a
    // ------------------------------------------------------

    if (!/^\d{4,8}$/.test(pin)) {
      return NextResponse.json(
        {
          error: "PIN muss aus 4 bis 8 Zahlen bestehen.",
        },
        {
          status: 400,
        }
      );
    }

    // ------------------------------------------------------
    // PROVJERA DUPLOG IMENA
    // ------------------------------------------------------

    const { data: existing, error: existingError } =
      await supabaseAdmin
        .from("workers")
        .select("id, name")
        .ilike("name", name)
        .maybeSingle();

    if (existingError) {
      throw existingError;
    }

    if (existing) {
      return NextResponse.json(
        {
          error:
            "Ein Mitarbeiter mit diesem Namen existiert bereits.",
        },
        {
          status: 409,
        }
      );
    }

    // ------------------------------------------------------
    // DODAJ RADNIKA
    // ------------------------------------------------------

    const { data: worker, error: insertError } =
      await supabaseAdmin
        .from("workers")
        .insert({
          name,
          role,
          active: true,
        })
        .select("id, name, role, active")
        .single();

    if (insertError) {
      throw insertError;
    }

    // ------------------------------------------------------
    // POSTAVI PIN
    // ------------------------------------------------------

    const { error: pinError } = await supabaseAdmin.rpc(
      "set_worker_pin",
      {
        p_worker_id: String(worker.id),
        p_pin: pin,
      }
    );

    if (pinError) {
      // Ako PIN nije mogao biti napravljen,
      // ukloni samo novog radnika kojeg smo upravo kreirali.
      await supabaseAdmin
        .from("workers")
        .delete()
        .eq("id", worker.id);

      throw pinError;
    }

    return NextResponse.json({
      success: true,

      worker: {
        id: String(worker.id),
        name: worker.name,
        role: worker.role,
        active: worker.active,
      },
    });
  } catch (error: any) {
    console.error("CREATE WORKER ERROR:", error);

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Mitarbeiter konnte nicht hinzugefügt werden.",
      },
      {
        status: 500,
      }
    );
  }
}

// ==========================================================
// PATCH - RADNIK IZMJENA / AKTIVIRANJE / DEAKTIVIRANJE
// ==========================================================

export async function PATCH(request: Request) {
  try {
    const admin = await getAdmin();

    if (!admin) {
      return NextResponse.json(
        {
          error: "Keine Berechtigung.",
        },
        {
          status: 403,
        }
      );
    }

    const body = await request.json();

    const id = String(body?.id || "").trim();
    const name = String(body?.name || "").trim();
    const pin = String(body?.pin || "").trim();

    const role: "admin" | "worker" =
      body?.role === "admin" ? "admin" : "worker";

    const active = body?.active !== false;

    // ------------------------------------------------------
    // PROVJERA ID-a
    // ------------------------------------------------------

    if (!id) {
      return NextResponse.json(
        {
          error: "Mitarbeiter-ID fehlt.",
        },
        {
          status: 400,
        }
      );
    }

    // ------------------------------------------------------
    // PROVJERA IMENA
    // ------------------------------------------------------

    if (!name) {
      return NextResponse.json(
        {
          error: "Name fehlt.",
        },
        {
          status: 400,
        }
      );
    }

    // ------------------------------------------------------
    // ADMIN NE MOŽE SAM SEBE DEAKTIVIRATI
    // NITI SKINUTI SEBI ADMIN PRAVA
    // ------------------------------------------------------

    if (
      String(admin.id) === id &&
      (!active || role !== "admin")
    ) {
      return NextResponse.json(
        {
          error:
            "Du kannst dein eigenes Admin-Konto nicht deaktivieren oder die Admin-Rolle entfernen.",
        },
        {
          status: 400,
        }
      );
    }

    // ------------------------------------------------------
    // AKO JE UNESEN NOVI PIN, PROVJERI GA PRIJE UPDATE-a
    // ------------------------------------------------------

    if (pin && !/^\d{4,8}$/.test(pin)) {
      return NextResponse.json(
        {
          error: "PIN muss aus 4 bis 8 Zahlen bestehen.",
        },
        {
          status: 400,
        }
      );
    }

    // ------------------------------------------------------
    // PROVJERA DUPLOG IMENA
    // ------------------------------------------------------

    const { data: duplicate, error: duplicateError } =
      await supabaseAdmin
        .from("workers")
        .select("id")
        .ilike("name", name)
        .neq("id", id)
        .maybeSingle();

    if (duplicateError) {
      throw duplicateError;
    }

    if (duplicate) {
      return NextResponse.json(
        {
          error:
            "Ein Mitarbeiter mit diesem Namen existiert bereits.",
        },
        {
          status: 409,
        }
      );
    }

    // ------------------------------------------------------
    // UPDATE RADNIKA
    // ------------------------------------------------------

    const { error: updateError } = await supabaseAdmin
      .from("workers")
      .update({
        name,
        role,
        active,
      })
      .eq("id", id);

    if (updateError) {
      throw updateError;
    }

    // ------------------------------------------------------
    // AKO JE UNESEN NOVI PIN
    // ------------------------------------------------------

    if (pin) {
      const { error: pinError } = await supabaseAdmin.rpc(
        "set_worker_pin",
        {
          p_worker_id: id,
          p_pin: pin,
        }
      );

      if (pinError) {
        throw pinError;
      }
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error: any) {
    console.error("UPDATE WORKER ERROR:", error);

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Mitarbeiter konnte nicht geändert werden.",
      },
      {
        status: 500,
      }
    );
  }
}
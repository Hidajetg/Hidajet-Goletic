import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { supabaseAdmin } from "../../../lib/supabase-admin";
import { createSessionToken } from "../../../lib/admin-session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const name = String(body?.name || "").trim();
    const pin = String(body?.pin || "").trim();

    // =========================================================
    // OSNOVNA PROVJERA
    // =========================================================

    if (!name || !pin) {
      return NextResponse.json(
        {
          error: "Bitte Name und PIN eingeben.",
        },
        {
          status: 400,
        }
      );
    }

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

    // =========================================================
    // PRONAĐI RADNIKA
    // =========================================================

    const {
      data: workers,
      error: workerError,
    } = await supabaseAdmin
      .from("workers")
      .select("id, name, role, active")
      .ilike("name", name)
      .limit(1);

    if (workerError) {
      console.error(
        "LOGIN - workers error:",
        workerError
      );

      return NextResponse.json(
        {
          error: "Mitarbeiter konnte nicht geladen werden.",
        },
        {
          status: 500,
        }
      );
    }

    const worker =
      Array.isArray(workers) && workers.length > 0
        ? workers[0]
        : null;

    if (!worker) {
      return NextResponse.json(
        {
          error: "Name oder PIN ist falsch.",
        },
        {
          status: 401,
        }
      );
    }

    // =========================================================
    // AKTIVAN?
    // =========================================================

    if (worker.active === false) {
      return NextResponse.json(
        {
          error: "Dieser Mitarbeiter ist deaktiviert.",
        },
        {
          status: 403,
        }
      );
    }

    // =========================================================
    // UČITAJ HASH PIN-a
    // =========================================================

    const {
      data: authData,
      error: authError,
    } = await supabaseAdmin
      .from("worker_auth")
      .select("pin_hash")
      .eq("worker_id", String(worker.id))
      .maybeSingle();

    if (authError) {
      console.error(
        "LOGIN - worker_auth error:",
        authError
      );

      return NextResponse.json(
        {
          error: "PIN konnte nicht geprüft werden.",
        },
        {
          status: 500,
        }
      );
    }

    if (!authData?.pin_hash) {
      console.error(
        "LOGIN - kein PIN für Worker:",
        worker.id,
        worker.name
      );

      return NextResponse.json(
        {
          error:
            "Für diesen Mitarbeiter ist noch kein PIN eingerichtet.",
        },
        {
          status: 401,
        }
      );
    }

    // =========================================================
    // PIN PROVJERA
    // =========================================================

    const pinCorrect = await bcrypt.compare(
      pin,
      authData.pin_hash
    );

    if (!pinCorrect) {
      return NextResponse.json(
        {
          error: "Name oder PIN ist falsch.",
        },
        {
          status: 401,
        }
      );
    }

    // =========================================================
    // ROLE
    // =========================================================

    const role: "admin" | "worker" =
      worker.role === "admin"
        ? "admin"
        : "worker";

    // =========================================================
    // SESSION TOKEN
    // =========================================================

    const token = createSessionToken({
      id: String(worker.id),
      name: String(worker.name),
      role,
    });

    // =========================================================
    // RESPONSE
    // =========================================================

    const response = NextResponse.json({
      success: true,

      user: {
        id: String(worker.id),
        name: String(worker.name),
        role,
      },
    });

    // =========================================================
    // SIGURNA COOKIE
    // =========================================================

    response.cookies.set({
      name: "solstone_session",
      value: token,

      httpOnly: true,

      secure:
        process.env.NODE_ENV === "production",

      sameSite: "lax",

      path: "/",

      maxAge:
        60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    console.error(
      "LOGIN COMPLETE ERROR:",
      error
    );

    return NextResponse.json(
      {
        error: "Fehler beim Login.",
      },
      {
        status: 500,
      }
    );
  }
}
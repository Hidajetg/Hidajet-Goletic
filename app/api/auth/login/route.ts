import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { supabaseAdmin } from "../../../lib/supabase-admin";
import {
  createSessionToken,
  verifySessionToken,
} from "../../../lib/admin-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Role = "admin" | "worker";

const LEGACY_USERS = [
  { id: "1", name: "Arnes", pin: "1111", role: "worker" as Role },
  { id: "2", name: "Ramiz", pin: "2222", role: "worker" as Role },
  { id: "4", name: "Shohruh", pin: "4444", role: "worker" as Role },
  { id: "6", name: "Hido", pin: "0000", role: "admin" as Role },
  { id: "7", name: "Steffi", pin: "0001", role: "admin" as Role },
];

function createLoginResponse(
  user: {
    id: string;
    name: string;
    role: Role;
  },
  remember: boolean,
) {
  const days = remember ? 30 : 7;

  const token = createSessionToken(user, days);

  const response = NextResponse.json({
    success: true,
    user,
  });

  const cookieOptions: {
    name: string;
    value: string;
    httpOnly: boolean;
    secure: boolean;
    sameSite: "lax";
    path: string;
    maxAge?: number;
  } = {
    name: "solstone_session",
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  };

  if (remember) {
    cookieOptions.maxAge = 60 * 60 * 24 * 30;
  }

  response.cookies.set(cookieOptions);

  return response;
}

// ============================================================
// GET - PROVJERA SAČUVANOG LOGIN-a
// ============================================================

export async function GET() {
  try {
    const cookieStore = await cookies();

    const token =
      cookieStore.get("solstone_session")?.value || null;

    const session = verifySessionToken(token);

    if (!session) {
      return NextResponse.json(
        {
          authenticated: false,
        },
        {
          status: 401,
        },
      );
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: String(session.id),
        name: String(session.name),
        role: session.role,
      },
    });
  } catch (error) {
    console.error("SESSION CHECK ERROR:", error);

    return NextResponse.json(
      {
        authenticated: false,
      },
      {
        status: 401,
      },
    );
  }
}

// ============================================================
// POST - LOGIN
// ============================================================

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const name = String(body?.name || "").trim();
    const pin = String(body?.pin || "").trim();
    const remember = body?.remember === true;

    if (!name || !/^\d{4,8}$/.test(pin)) {
      return NextResponse.json(
        {
          error:
            "Bitte Mitarbeiter und gültigen PIN eingeben.",
        },
        {
          status: 400,
        },
      );
    }

    // --------------------------------------------------------
    // STARI POSTOJEĆI LOGIN
    // --------------------------------------------------------

    const legacy = LEGACY_USERS.find(
      (user) =>
        user.name.toLowerCase() === name.toLowerCase(),
    );

    if (legacy && legacy.pin === pin) {
      let id = legacy.id;
      let finalName = legacy.name;
      let role = legacy.role;

      try {
        const { data } = await supabaseAdmin
          .from("workers")
          .select("id, name, role, active")
          .ilike("name", legacy.name)
          .limit(1);

        const worker = data?.[0];

        if (worker) {
          if (worker.active === false) {
            return NextResponse.json(
              {
                error:
                  "Dieser Mitarbeiter ist deaktiviert.",
              },
              {
                status: 403,
              },
            );
          }

          id = String(worker.id);
          finalName = String(
            worker.name || legacy.name,
          );

          role =
            String(worker.role || "").toLowerCase() ===
            "admin"
              ? "admin"
              : legacy.role;
        }
      } catch (error) {
        console.error(
          "Legacy worker lookup:",
          error,
        );
      }

      return createLoginResponse(
        {
          id,
          name: finalName,
          role,
        },
        remember,
      );
    }

    // --------------------------------------------------------
    // NOVI RADNICI IZ ADMIN PANELA
    // --------------------------------------------------------

    const {
      data: workers,
      error: workerError,
    } = await supabaseAdmin
      .from("workers")
      .select("id, name, role, active")
      .ilike("name", name)
      .limit(1);

    if (workerError) {
      console.error(workerError);

      return NextResponse.json(
        {
          error: "Login konnte nicht geprüft werden.",
        },
        {
          status: 500,
        },
      );
    }

    const worker = workers?.[0];

    if (!worker) {
      return NextResponse.json(
        {
          error: "Name oder PIN ist falsch.",
        },
        {
          status: 401,
        },
      );
    }

    if (worker.active === false) {
      return NextResponse.json(
        {
          error: "Dieser Mitarbeiter ist deaktiviert.",
        },
        {
          status: 403,
        },
      );
    }

    const {
      data: auth,
      error: authError,
    } = await supabaseAdmin
      .from("worker_auth")
      .select("pin_hash")
      .eq("worker_id", String(worker.id))
      .maybeSingle();

    if (authError || !auth?.pin_hash) {
      console.error(authError);

      return NextResponse.json(
        {
          error:
            "Für diesen Mitarbeiter ist kein gültiger PIN eingerichtet.",
        },
        {
          status: 401,
        },
      );
    }

    const validPin = await bcrypt.compare(
      pin,
      String(auth.pin_hash),
    );

    if (!validPin) {
      return NextResponse.json(
        {
          error: "Name oder PIN ist falsch.",
        },
        {
          status: 401,
        },
      );
    }

    const role: Role =
      String(worker.role || "").toLowerCase() ===
      "admin"
        ? "admin"
        : "worker";

    return createLoginResponse(
      {
        id: String(worker.id),
        name: String(worker.name),
        role,
      },
      remember,
    );
  } catch (error) {
    console.error("LOGIN ERROR:", error);

    return NextResponse.json(
      {
        error: "Anmeldung fehlgeschlagen.",
      },
      {
        status: 500,
      },
    );
  }
}
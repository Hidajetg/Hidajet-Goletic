import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { supabaseAdmin } from "../../../lib/supabase-admin";
import { getVerifiedAppUser } from "../../../lib/verified-dashboard-admin";
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
  verifiedPersonalPin = false,
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
  // Single sign-on: only the real bcrypt login grants a scoped chat token.
  // Clear any previous chat credential on a legacy shortcut login.
  response.cookies.set({
    ...cookieOptions,
    name: "solstone_chat_auth",
    value: verifiedPersonalPin ? createSessionToken({...user, purpose:"chat"}, days) : "",
    ...(verifiedPersonalPin ? {} : {maxAge:0}),
  });

  return response;
}

// ============================================================
// GET - PROVJERA SAČUVANOG LOGIN-a
// ============================================================

export async function GET() {
  try {
    // Check the same signed cookie AND active Supabase identity used by
    // worker/admin calendar APIs. Never claim localStorage alone is a login.
    const user = await getVerifiedAppUser();
    if (!user) {
      return NextResponse.json({ authenticated: false }, {
        status: 401, headers: { "Cache-Control": "private, no-store" },
      });
    }
    return NextResponse.json({
      authenticated: true,
      user: { id: user.id, name: user.name, role: user.isAdmin ? "admin" : "worker" },
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("SESSION CHECK ERROR:", error);
    return NextResponse.json({ authenticated: false }, {
      status: 503, headers: { "Cache-Control": "private, no-store" },
    });
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
      const {data, error} = await supabaseAdmin.from("workers")
        .select("id,name,role,active,archived_at")
        .ilike("name", legacy.name).limit(1);
      if (error) throw error;
      const worker = data?.[0];
      if (!worker || worker.active === false || worker.archived_at) {
        return NextResponse.json({error:"Dieses Mitarbeiterkonto ist nicht aktiv."},{status:403});
      }
      const role: Role = String(worker.role).toLowerCase()==="admin" ? "admin" : "worker";
      // If the PIN is also the verified personal PIN, issue the chat credential
      // as part of the normal login rather than asking the user for it again.
      const {data:credential,error:credentialError} = await supabaseAdmin.from("worker_auth")
        .select("pin_hash").eq("worker_id",String(worker.id)).maybeSingle();
      if (credentialError) throw credentialError;
      const verified = !!credential?.pin_hash && await bcrypt.compare(pin,String(credential.pin_hash));
      return createLoginResponse({id:String(worker.id),name:String(worker.name),role},remember,verified);
    }

    // --------------------------------------------------------
    // NOVI RADNICI IZ ADMIN PANELA
    // --------------------------------------------------------

    const {
      data: workers,
      error: workerError,
    } = await supabaseAdmin
      .from("workers")
      .select("id, name, role, active, archived_at")
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

    if (worker.active === false || worker.archived_at) {
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
      true,
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
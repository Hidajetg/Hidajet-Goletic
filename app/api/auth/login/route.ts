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

const MOBILE_ORIGINS = new Set([
  "http://localhost",
  "https://localhost",
  "capacitor://localhost",
  "ionic://localhost",
]);

function corsHeaders(request: Request) {
  const origin = request.headers.get("origin") || "";
  const headers = new Headers();

  if (MOBILE_ORIGINS.has(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Vary", "Origin");
  }

  headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  headers.set("Access-Control-Max-Age", "86400");

  return headers;
}

function json(
  request: Request,
  body: unknown,
  init: { status?: number } = {},
) {
  return NextResponse.json(body, {
    status: init.status,
    headers: corsHeaders(request),
  });
}

function bearerToken(request: Request) {
  const authorization = request.headers.get("authorization") || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

function createLoginResponse(
  request: Request,
  user: {
    id: string;
    name: string;
    role: Role;
  },
  remember: boolean,
) {
  const days = remember ? 30 : 7;
  const token = createSessionToken(user, days);

  const response = NextResponse.json(
    {
      success: true,
      user,
      sessionToken: token,
    },
    {
      headers: corsHeaders(request),
    },
  );

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

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(request),
  });
}

// ============================================================
// GET - PROVJERA SAČUVANOG LOGIN-a
// Web koristi HttpOnly cookie, mobilna aplikacija Bearer token.
// ============================================================
export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const token =
      bearerToken(request) ||
      cookieStore.get("solstone_session")?.value ||
      null;

    const session = verifySessionToken(token);

    if (!session) {
      return json(
        request,
        { authenticated: false },
        { status: 401 },
      );
    }

    return json(request, {
      authenticated: true,
      user: {
        id: String(session.id),
        name: String(session.name),
        role: session.role,
      },
    });
  } catch (error) {
    console.error("SESSION CHECK ERROR:", error);
    return json(
      request,
      { authenticated: false },
      { status: 401 },
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
      return json(
        request,
        { error: "Bitte Mitarbeiter und gültigen PIN eingeben." },
        { status: 400 },
      );
    }

    // --------------------------------------------------------
    // STARI POSTOJEĆI LOGIN
    // --------------------------------------------------------
    const legacy = LEGACY_USERS.find(
      (user) => user.name.toLowerCase() === name.toLowerCase(),
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
            return json(
              request,
              { error: "Dieser Mitarbeiter ist deaktiviert." },
              { status: 403 },
            );
          }

          id = String(worker.id);
          finalName = String(worker.name || legacy.name);
          role =
            String(worker.role || "").toLowerCase() === "admin"
              ? "admin"
              : legacy.role;
        }
      } catch (error) {
        console.error("Legacy worker lookup:", error);
      }

      return createLoginResponse(
        request,
        { id, name: finalName, role },
        remember,
      );
    }

    // --------------------------------------------------------
    // NOVI RADNICI IZ ADMIN PANELA
    // --------------------------------------------------------
    const { data: workers, error: workerError } = await supabaseAdmin
      .from("workers")
      .select("id, name, role, active")
      .ilike("name", name)
      .limit(1);

    if (workerError) {
      console.error(workerError);
      return json(
        request,
        { error: "Login konnte nicht geprüft werden." },
        { status: 500 },
      );
    }

    const worker = workers?.[0];

    if (!worker) {
      return json(
        request,
        { error: "Name oder PIN ist falsch." },
        { status: 401 },
      );
    }

    if (worker.active === false) {
      return json(
        request,
        { error: "Dieser Mitarbeiter ist deaktiviert." },
        { status: 403 },
      );
    }

    const { data: auth, error: authError } = await supabaseAdmin
      .from("worker_auth")
      .select("pin_hash")
      .eq("worker_id", String(worker.id))
      .maybeSingle();

    if (authError || !auth?.pin_hash) {
      console.error(authError);
      return json(
        request,
        { error: "Für diesen Mitarbeiter ist kein gültiger PIN eingerichtet." },
        { status: 401 },
      );
    }

    const validPin = await bcrypt.compare(pin, String(auth.pin_hash));

    if (!validPin) {
      return json(
        request,
        { error: "Name oder PIN ist falsch." },
        { status: 401 },
      );
    }

    const role: Role =
      String(worker.role || "").toLowerCase() === "admin"
        ? "admin"
        : "worker";

    return createLoginResponse(
      request,
      {
        id: String(worker.id),
        name: String(worker.name),
        role,
      },
      remember,
    );
  } catch (error) {
    console.error("LOGIN ERROR:", error);
    return json(
      request,
      { error: "Anmeldung fehlgeschlagen." },
      { status: 500 },
    );
  }
}

import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase-admin";
import { createSessionToken } from "../../../lib/admin-session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const name = String(body?.name || "").trim();
    const pin = String(body?.pin || "").trim();

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

    const { data, error } = await supabaseAdmin.rpc(
      "verify_worker_login",
      {
        p_name: name,
        p_pin: pin,
      }
    );

    if (error) {
      console.error("Login RPC error:", error);

      return NextResponse.json(
        {
          error: "Login konnte nicht geprüft werden.",
        },
        {
          status: 500,
        }
      );
    }

    const user = Array.isArray(data) ? data[0] : null;

    if (!user) {
      return NextResponse.json(
        {
          error: "Name oder PIN ist falsch.",
        },
        {
          status: 401,
        }
      );
    }

    if (!user.active) {
      return NextResponse.json(
        {
          error: "Dieser Mitarbeiter ist deaktiviert.",
        },
        {
          status: 403,
        }
      );
    }

    const role =
      user.role === "admin" ? "admin" : "worker";

    const token = createSessionToken({
      id: String(user.id),
      name: String(user.name),
      role,
    });

    const response = NextResponse.json({
      success: true,

      user: {
        id: String(user.id),
        name: String(user.name),
        role,
      },
    });

    response.cookies.set({
      name: "solstone_session",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    console.error("LOGIN ERROR:", error);

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
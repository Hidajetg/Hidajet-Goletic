import { randomBytes } from "crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const clientId = process.env.ONEDRIVE_CLIENT_ID;
  const redirectUri = process.env.ONEDRIVE_REDIRECT_URI;
  const tenant = process.env.ONEDRIVE_TENANT || "consumers";

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      {
        error:
          "Nedostaje ONEDRIVE_CLIENT_ID ili ONEDRIVE_REDIRECT_URI u Vercel Environment Variables.",
      },
      { status: 500 }
    );
  }

  // Zaštita od lažnog OAuth povratnog zahtjeva.
  const state = randomBytes(32).toString("hex");

  const authorizationUrl = new URL(
    `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`
  );

  authorizationUrl.searchParams.set("client_id", clientId);
  authorizationUrl.searchParams.set("response_type", "code");
  authorizationUrl.searchParams.set("redirect_uri", redirectUri);
  authorizationUrl.searchParams.set("response_mode", "query");
  authorizationUrl.searchParams.set(
    "scope",
    "offline_access User.Read Files.ReadWrite"
  );
  authorizationUrl.searchParams.set("state", state);
  authorizationUrl.searchParams.set("prompt", "consent");

  const response = NextResponse.redirect(authorizationUrl);

  response.cookies.set("onedrive_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60,
  });

  return response;
}
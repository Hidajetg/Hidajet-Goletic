import { createCipheriv, randomBytes } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type MicrosoftTokenResponse = {
  token_type?: string;
  scope?: string;
  expires_in?: number;
  access_token?: string;
  refresh_token?: string;
  error?: string;
  error_description?: string;
};

type GraphUser = {
  id: string;
  displayName?: string;
  mail?: string | null;
  userPrincipalName?: string | null;
};

type GraphDrive = {
  id: string;
};

type GraphDriveItem = {
  id: string;
  name: string;
  webUrl?: string;
  folder?: {
    childCount?: number;
  };
};

function redirectToDashboard(
  request: NextRequest,
  status: "connected" | "error",
  message?: string
) {
  const url = new URL("/dashboard", request.url);

  url.searchParams.set("onedrive", status);

  if (message) {
    url.searchParams.set("message", message);
  }

  const response = NextResponse.redirect(url);

  // Brišemo privremeni OAuth state cookie.
  response.cookies.set("onedrive_oauth_state", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}

function encryptRefreshToken(
  refreshToken: string,
  encryptionKeyHex: string
): string {
  if (!/^[a-f0-9]{64}$/i.test(encryptionKeyHex)) {
    throw new Error(
      "ONEDRIVE_TOKEN_ENCRYPTION_KEY mora imati tačno 64 heksadecimalna znaka."
    );
  }

  const key = Buffer.from(encryptionKeyHex, "hex");
  const iv = randomBytes(12);

  const cipher = createCipheriv("aes-256-gcm", key, iv);

  const encrypted = Buffer.concat([
    cipher.update(refreshToken, "utf8"),
    cipher.final(),
  ]);

  const authenticationTag = cipher.getAuthTag();

  return [
    "v1",
    iv.toString("base64url"),
    authenticationTag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}

async function graphGet<T>(
  path: string,
  accessToken: string
): Promise<T> {
  const response = await fetch(
    `https://graph.microsoft.com/v1.0${path}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      `Microsoft Graph greška ${response.status}: ${errorText}`
    );
  }

  return (await response.json()) as T;
}

export async function GET(request: NextRequest) {
  try {
    const callbackUrl = new URL(request.url);

    const microsoftError = callbackUrl.searchParams.get("error");
    const authorizationCode = callbackUrl.searchParams.get("code");
    const returnedState = callbackUrl.searchParams.get("state");
    const savedState = request.cookies.get(
      "onedrive_oauth_state"
    )?.value;

    if (microsoftError) {
      return redirectToDashboard(
        request,
        "error",
        "Microsoft prijava je prekinuta ili odbijena."
      );
    }

    if (
      !authorizationCode ||
      !returnedState ||
      !savedState ||
      returnedState !== savedState
    ) {
      return redirectToDashboard(
        request,
        "error",
        "Neispravan ili istekao OneDrive zahtjev."
      );
    }

    const clientId = process.env.ONEDRIVE_CLIENT_ID;
    const clientSecret = process.env.ONEDRIVE_CLIENT_SECRET;
    const redirectUri = process.env.ONEDRIVE_REDIRECT_URI;
    const tenant = process.env.ONEDRIVE_TENANT || "consumers";
    const encryptionKey =
      process.env.ONEDRIVE_TOKEN_ENCRYPTION_KEY;

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseSecretKey =
      process.env.SUPABASE_SECRET_KEY;

    if (
      !clientId ||
      !clientSecret ||
      !redirectUri ||
      !encryptionKey ||
      !supabaseUrl ||
      !supabaseSecretKey
    ) {
      throw new Error(
        "Nedostaju potrebne serverske Environment Variables."
      );
    }

    const tokenResponse = await fetch(
      `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code: authorizationCode,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
          scope:
            "offline_access User.Read Files.ReadWrite",
        }),
        cache: "no-store",
      }
    );

    const tokenData =
      (await tokenResponse.json()) as MicrosoftTokenResponse;

    if (
      !tokenResponse.ok ||
      !tokenData.access_token ||
      !tokenData.refresh_token
    ) {
      console.error("Microsoft token error:", {
        status: tokenResponse.status,
        error: tokenData.error,
        description: tokenData.error_description,
      });

      throw new Error(
        "Microsoft nije vratio potrebne OneDrive tokene."
      );
    }

    const accessToken = tokenData.access_token;

    const [user, drive] = await Promise.all([
      graphGet<GraphUser>(
        "/me?$select=id,displayName,mail,userPrincipalName",
        accessToken
      ),
      graphGet<GraphDrive>(
        "/me/drive?$select=id",
        accessToken
      ),
    ]);

    const archivePath =
      "Documents/006 Baustellendokumentation";

    const encodedArchivePath = archivePath
      .split("/")
      .map((part) => encodeURIComponent(part))
      .join("/");

    const archiveFolder = await graphGet<GraphDriveItem>(
      `/me/drive/root:/${encodedArchivePath}?$select=id,name,webUrl,folder`,
      accessToken
    );

    if (!archiveFolder.folder) {
      throw new Error(
        "006 Baustellendokumentation nije OneDrive folder."
      );
    }

    const encryptedRefreshToken = encryptRefreshToken(
      tokenData.refresh_token,
      encryptionKey
    );

    const tokenExpiresAt = new Date(
      Date.now() +
        (tokenData.expires_in ?? 3600) * 1000
    ).toISOString();

    const supabaseAdmin = createClient(
      supabaseUrl,
      supabaseSecretKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
        },
      }
    );

    const { error: databaseError } = await supabaseAdmin
      .from("onedrive_connections")
      .upsert(
        {
          provider: "microsoft",
          account_email:
            user.mail ??
            user.userPrincipalName ??
            null,
          drive_id: drive.id,
          archive_folder_id: archiveFolder.id,
          archive_folder_web_url:
            archiveFolder.webUrl ?? null,
          refresh_token_encrypted:
            encryptedRefreshToken,
          token_expires_at: tokenExpiresAt,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "provider",
        }
      );

    if (databaseError) {
      throw new Error(
        `Supabase greška: ${databaseError.message}`
      );
    }

    return redirectToDashboard(
      request,
      "connected",
      "OneDrive je uspješno povezan."
    );
  } catch (error) {
    console.error("OneDrive callback error:", error);

    return redirectToDashboard(
      request,
      "error",
      "OneDrive povezivanje nije uspjelo."
    );
  }
}
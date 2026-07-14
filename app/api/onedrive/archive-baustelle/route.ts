import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { createClient } from "@supabase/supabase-js";
import chromium from "@sparticuz/chromium";
import puppeteer, { type Browser, type Page } from "puppeteer-core";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

type JsonRow = Record<string, any>;

type ArchiveRequestBody = {
  baustelleId?: string | number;
};

type BaustelleRow = JsonRow & {
  id: string | number;
  naziv?: string | null;
  lokacija?: string | null;
  status?: string | null;
};

type OneDriveConnection = {
  provider: string;
  drive_id: string | null;
  archive_folder_id: string | null;
  archive_folder_web_url: string | null;
  refresh_token_encrypted: string;
};

type MicrosoftRefreshResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
};

type GraphDriveItem = {
  id: string;
  name: string;
  size?: number;
  webUrl?: string;
  folder?: {
    childCount?: number;
  };
  file?: {
    mimeType?: string;
  };
};

type GraphChildrenResponse = {
  value?: GraphDriveItem[];
};

type FileCandidate = {
  sourceTable: string;
  sourceId: string;
  reference: string;
};

type DownloadedFile = {
  bytes: Uint8Array;
  contentType: string;
  originalName: string;
  bucketId?: string;
  storagePath?: string;
};

const PHOTO_REFERENCE_FIELDS = [
  "photo_url",
  "foto_url",
  "image_url",
  "bild_url",
  "public_url",
  "file_url",
  "url",
  "storage_path",
  "file_path",
] as const;

function jsonResponse(body: unknown, status = 200) {
  return NextResponse.json(body, { status });
}

function requireEnvironmentVariable(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Fehlende Umgebungsvariable: ${name}`);
  }

  return value;
}

function sanitizeOneDriveName(value: string, fallback: string) {
  const cleaned = String(value || "")
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/[\u0000-\u001f]/g, "")
    .replace(/\s+/g, " ")
    .replace(/[. ]+$/g, "")
    .trim();

  return (cleaned || fallback).slice(0, 140);
}

function decryptRefreshToken(payload: string, encryptionKeyHex: string) {
  if (!/^[a-f0-9]{64}$/i.test(encryptionKeyHex)) {
    throw new Error(
      "ONEDRIVE_TOKEN_ENCRYPTION_KEY muss genau 64 hexadezimale Zeichen enthalten."
    );
  }

  const [version, ivPart, tagPart, encryptedPart] = payload.split(".");

  if (version !== "v1" || !ivPart || !tagPart || !encryptedPart) {
    throw new Error(
      "Das Format des verschlüsselten OneDrive-Tokens ist ungültig."
    );
  }

  const key = Buffer.from(encryptionKeyHex, "hex");
  const iv = Buffer.from(ivPart, "base64url");
  const authenticationTag = Buffer.from(tagPart, "base64url");
  const encrypted = Buffer.from(encryptedPart, "base64url");

  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authenticationTag);

  return Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]).toString("utf8");
}

function encryptRefreshToken(
  refreshToken: string,
  encryptionKeyHex: string
) {
  if (!/^[a-f0-9]{64}$/i.test(encryptionKeyHex)) {
    throw new Error(
      "ONEDRIVE_TOKEN_ENCRYPTION_KEY muss genau 64 hexadezimale Zeichen enthalten."
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

async function refreshMicrosoftAccessToken(
  encryptedRefreshToken: string,
  encryptionKey: string,
  clientId: string,
  clientSecret: string,
  tenant: string,
  redirectUri: string
) {
  const oldRefreshToken = decryptRefreshToken(
    encryptedRefreshToken,
    encryptionKey
  );

  const response = await fetch(
    `https://login.microsoftonline.com/${encodeURIComponent(
      tenant
    )}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: oldRefreshToken,
        redirect_uri: redirectUri,
        grant_type: "refresh_token",
        scope: "offline_access User.Read Files.ReadWrite",
      }),
      cache: "no-store",
    }
  );

  const tokenData =
    (await response.json()) as MicrosoftRefreshResponse;

  if (!response.ok || !tokenData.access_token) {
    throw new Error(
      `Microsoft-Tokenfehler: ${
        tokenData.error_description ||
        tokenData.error ||
        response.status
      }`
    );
  }

  return {
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token || oldRefreshToken,
    refreshTokenChanged:
      Boolean(tokenData.refresh_token) &&
      tokenData.refresh_token !== oldRefreshToken,
    expiresIn: tokenData.expires_in ?? 3600,
  };
}

async function graphJson<T>(
  url: string,
  accessToken: string,
  init: RequestInit = {}
): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      ...(init.body
        ? { "Content-Type": "application/json" }
        : {}),
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      `Microsoft Graph ${response.status}: ${errorText}`
    );
  }

  return (await response.json()) as T;
}

async function ensureOneDriveFolder(
  driveId: string,
  parentItemId: string,
  folderName: string,
  accessToken: string
): Promise<GraphDriveItem> {
  const safeName = sanitizeOneDriveName(folderName, "Ordner");
  const encodedName = encodeURIComponent(safeName);

  const getUrl =
    `https://graph.microsoft.com/v1.0/drives/${encodeURIComponent(
      driveId
    )}/items/${encodeURIComponent(
      parentItemId
    )}:/${encodedName}?$select=id,name,webUrl,folder`;

  const existingResponse = await fetch(getUrl, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (existingResponse.ok) {
    const existing =
      (await existingResponse.json()) as GraphDriveItem;

    if (!existing.folder) {
      throw new Error(
        `OneDrive-Eintrag ist kein Ordner: ${safeName}`
      );
    }

    return existing;
  }

  if (existingResponse.status !== 404) {
    const errorText = await existingResponse.text();

    throw new Error(
      `OneDrive-Ordnerprüfung ${existingResponse.status}: ${errorText}`
    );
  }

  return graphJson<GraphDriveItem>(
    `https://graph.microsoft.com/v1.0/drives/${encodeURIComponent(
      driveId
    )}/items/${encodeURIComponent(parentItemId)}/children`,
    accessToken,
    {
      method: "POST",
      body: JSON.stringify({
        name: safeName,
        folder: {},
        "@microsoft.graph.conflictBehavior": "rename",
      }),
    }
  );
}

async function uploadOneDriveFile(
  driveId: string,
  parentItemId: string,
  fileName: string,
  bytes: Uint8Array,
  contentType: string,
  accessToken: string
) {
  const safeName = sanitizeOneDriveName(
    fileName,
    "Datei.bin"
  );

  const encodedName = encodeURIComponent(safeName);
  const body = new Uint8Array(bytes).buffer;

  const response = await fetch(
    `https://graph.microsoft.com/v1.0/drives/${encodeURIComponent(
      driveId
    )}/items/${encodeURIComponent(
      parentItemId
    )}:/${encodedName}:/content`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": contentType,
      },
      body,
      cache: "no-store",
    }
  );

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      `OneDrive-Upload ${response.status}: ${errorText}`
    );
  }

  const item = (await response.json()) as GraphDriveItem;

  if (
    typeof item.size === "number" &&
    item.size !== bytes.byteLength
  ) {
    throw new Error(
      `Die Dateigröße auf OneDrive stimmt nicht überein: ${item.size} / ${bytes.byteLength}`
    );
  }

  return item;
}

async function loadRowsByEqual(
  supabaseAdmin: any,
  table: string,
  column: string,
  value: string | number
): Promise<JsonRow[]> {
  const { data, error } = await supabaseAdmin
    .from(table)
    .select("*")
    .eq(column, value);

  if (error) {
    throw new Error(
      `${table}.${column}: ${error.message}`
    );
  }

  return (data ?? []) as JsonRow[];
}

async function loadRowsByIn(
  supabaseAdmin: any,
  table: string,
  column: string,
  values: Array<string | number>
): Promise<JsonRow[]> {
  if (values.length === 0) {
    return [];
  }

  const allRows: JsonRow[] = [];

  for (
    let offset = 0;
    offset < values.length;
    offset += 100
  ) {
    const chunk = values.slice(offset, offset + 100);

    const { data, error } = await supabaseAdmin
      .from(table)
      .select("*")
      .in(column, chunk);

    if (error) {
      throw new Error(
        `${table}.${column}: ${error.message}`
      );
    }

    allRows.push(...((data ?? []) as JsonRow[]));
  }

  return allRows;
}

function uniqueRows(rows: JsonRow[]) {
  const seen = new Set<string>();
  const result: JsonRow[] = [];

  for (const row of rows) {
    const key =
      row.id !== null && row.id !== undefined
        ? `id:${String(row.id)}`
        : JSON.stringify(row);

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(row);
  }

  return result;
}

function collectFileCandidates(
  tableRows: Array<{
    table: string;
    rows: JsonRow[];
  }>
) {
  const seen = new Set<string>();
  const candidates: FileCandidate[] = [];

  for (const { table, rows } of tableRows) {
    for (const row of rows) {
      for (const field of PHOTO_REFERENCE_FIELDS) {
        const rawValue = row[field];

        if (
          typeof rawValue !== "string" ||
          !rawValue.trim()
        ) {
          continue;
        }

        const reference = rawValue.trim();

        const normalized = reference.replace(
          /[?#].*$/,
          ""
        );

        if (seen.has(normalized)) {
          continue;
        }

        seen.add(normalized);

        candidates.push({
          sourceTable: table,
          sourceId: String(
            row.id ?? candidates.length + 1
          ),
          reference,
        });
      }
    }
  }

  return candidates;
}

function parseSupabaseStorageUrl(reference: string) {
  try {
    const url = new URL(reference);

    const match = url.pathname.match(
      /\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^/]+)\/(.+)$/
    );

    if (!match) {
      return null;
    }

    return {
      bucketId: decodeURIComponent(match[1]),
      storagePath: decodeURIComponent(match[2]),
    };
  } catch {
    return null;
  }
}

function getFileNameFromReference(
  reference: string,
  fallback: string
) {
  try {
    const url = new URL(reference);

    const lastPart = url.pathname
      .split("/")
      .filter(Boolean)
      .pop();

    return sanitizeOneDriveName(
      lastPart
        ? decodeURIComponent(lastPart)
        : fallback,
      fallback
    );
  } catch {
    const lastPart = reference
      .split(/[\\/]/)
      .filter(Boolean)
      .pop();

    return sanitizeOneDriveName(
      lastPart || fallback,
      fallback
    );
  }
}

function parseDataUrl(reference: string) {
  const match = reference.match(
    /^data:([^;]+);base64,(.+)$/i
  );

  if (!match) {
    return null;
  }

  return {
    contentType:
      match[1] || "application/octet-stream",
    bytes: new Uint8Array(
      Buffer.from(match[2], "base64")
    ),
  };
}

function extensionFromContentType(
  contentType: string
) {
  const normalized = contentType
    .toLowerCase()
    .split(";")[0]
    .trim();

  const map: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "image/heic": ".heic",
    "image/heif": ".heif",
    "application/pdf": ".pdf",
  };

  return map[normalized] || "";
}

function ensureExtension(
  fileName: string,
  contentType: string
) {
  if (/\.[a-z0-9]{2,6}$/i.test(fileName)) {
    return fileName;
  }

  return `${fileName}${extensionFromContentType(
    contentType
  )}`;
}

async function downloadFileCandidate(
  supabaseAdmin: any,
  candidate: FileCandidate,
  bucketIds: string[],
  supabaseHost: string
): Promise<DownloadedFile> {
  const dataUrl = parseDataUrl(candidate.reference);

  if (dataUrl) {
    return {
      bytes: dataUrl.bytes,
      contentType: dataUrl.contentType,
      originalName: ensureExtension(
        `${candidate.sourceTable}-${candidate.sourceId}`,
        dataUrl.contentType
      ),
    };
  }

  const parsedStorageUrl = parseSupabaseStorageUrl(
    candidate.reference
  );

  if (parsedStorageUrl) {
    const { data, error } =
      await supabaseAdmin.storage
        .from(parsedStorageUrl.bucketId)
        .download(parsedStorageUrl.storagePath);

    if (error || !data) {
      throw new Error(
        `Supabase-Storage-Download fehlgeschlagen: ${
          error?.message || "keine Datei"
        }`
      );
    }

    const contentType =
      data.type || "application/octet-stream";

    const originalName = ensureExtension(
      getFileNameFromReference(
        parsedStorageUrl.storagePath,
        "Datei"
      ),
      contentType
    );

    return {
      bytes: new Uint8Array(
        await data.arrayBuffer()
      ),
      contentType,
      originalName,
      bucketId: parsedStorageUrl.bucketId,
      storagePath: parsedStorageUrl.storagePath,
    };
  }

  if (/^https?:\/\//i.test(candidate.reference)) {
    const url = new URL(candidate.reference);

    if (url.hostname !== supabaseHost) {
      throw new Error(
        `Externe Datei-URL ist nicht erlaubt: ${url.hostname}`
      );
    }

    const response = await fetch(
      candidate.reference,
      {
        method: "GET",
        cache: "no-store",
      }
    );

    if (!response.ok) {
      throw new Error(
        `Dateidownload HTTP ${response.status}`
      );
    }

    const contentType =
      response.headers.get("content-type") ||
      "application/octet-stream";

    const originalName = ensureExtension(
      getFileNameFromReference(
        candidate.reference,
        "Datei"
      ),
      contentType
    );

    return {
      bytes: new Uint8Array(
        await response.arrayBuffer()
      ),
      contentType,
      originalName,
    };
  }

  const cleanPath = candidate.reference.replace(
    /^\/+/,
    ""
  );

  const firstPart = cleanPath.split("/")[0];

  const bucketOrder = bucketIds.includes(firstPart)
    ? [
        firstPart,
        ...bucketIds.filter(
          (bucketId) => bucketId !== firstPart
        ),
      ]
    : bucketIds;

  for (const bucketId of bucketOrder) {
    const storagePath =
      bucketId === firstPart
        ? cleanPath
            .slice(firstPart.length)
            .replace(/^\/+/, "")
        : cleanPath;

    const { data, error } =
      await supabaseAdmin.storage
        .from(bucketId)
        .download(storagePath);

    if (!error && data) {
      const contentType =
        data.type || "application/octet-stream";

      const originalName = ensureExtension(
        getFileNameFromReference(
          storagePath,
          "Datei"
        ),
        contentType
      );

      return {
        bytes: new Uint8Array(
          await data.arrayBuffer()
        ),
        contentType,
        originalName,
        bucketId,
        storagePath,
      };
    }
  }

  throw new Error(
    "Die Datei wurde in keinem Supabase-Storage-Bucket gefunden."
  );
}

async function createBrowser() {
  return puppeteer.launch({
    args: chromium.args,
    defaultViewport: {
      width: 1440,
      height: 1600,
      deviceScaleFactor: 1,
      hasTouch: false,
      isLandscape: false,
      isMobile: false,
    },
    executablePath: await chromium.executablePath(),
    headless: true,
  });
}

async function createAdminPage(browser: Browser) {
  const page = await browser.newPage();

  const adminValue = JSON.stringify({
    name: "Hido",
    role: "admin",
    is_admin: true,
    admin: true,
  });

  await page.evaluateOnNewDocument(
    (serializedAdmin: string) => {
      try {
        localStorage.setItem(
          "currentWorker",
          serializedAdmin
        );

        localStorage.setItem(
          "currentUser",
          serializedAdmin
        );

        localStorage.setItem(
          "loggedUser",
          serializedAdmin
        );

        localStorage.setItem(
          "worker",
          serializedAdmin
        );
      } catch {
        // Leere Browser-Seiten haben manchmal
        // noch keinen Local-Storage-Zugriff.
      }
    },
    adminValue
  );

  return page;
}

async function waitForPrintablePage(
  page: Page,
  readyText: string,
  loadingTexts: string[]
) {
  await page.waitForFunction(
    ({
      ready,
      loading,
    }: {
      ready: string;
      loading: string[];
    }) => {
      const text =
        document.body?.innerText || "";

      const stillLoading = loading.some(
        (value: string) =>
          text.includes(value)
      );

      return (
        !stillLoading &&
        text.includes(ready)
      );
    },
    {
      timeout: 90_000,
    },
    {
      ready: readyText,
      loading: loadingTexts,
    }
  );

  const accessDenied = await page.evaluate(() =>
    (document.body?.innerText || "").includes(
      "Kein Zugriff"
    )
  );

  if (accessDenied) {
    throw new Error(
      "Die PDF-Seite konnte nicht als Administrator geöffnet werden."
    );
  }

  await page.evaluate(async () => {
    const fontSet = (
      document as Document & {
        fonts?: FontFaceSet;
      }
    ).fonts;

    if (fontSet?.ready) {
      await fontSet.ready;
    }

    const imagePromises =
      Array.from(document.images).map(
        (image) =>
          new Promise<void>((resolve) => {
            if (image.complete) {
              resolve();
              return;
            }

            image.addEventListener(
              "load",
              () => resolve(),
              { once: true }
            );

            image.addEventListener(
              "error",
              () => resolve(),
              { once: true }
            );
          })
      );

    await Promise.race([
      Promise.all(imagePromises),
      new Promise<void>((resolve) =>
        window.setTimeout(resolve, 12_000)
      ),
    ]);
  });
}

async function renderPdf(
  page: Page,
  url: string,
  readyText: string,
  loadingTexts: string[]
) {
  const response = await page.goto(url, {
    waitUntil: "networkidle2",
    timeout: 90_000,
  });

  if (!response || !response.ok()) {
    throw new Error(
      `PDF-Seite konnte nicht geladen werden: ${
        response?.status() || "keine Antwort"
      }`
    );
  }

  await waitForPrintablePage(
    page,
    readyText,
    loadingTexts
  );

  await page.emulateMediaType("print");

  const pdf = await page.pdf({
    printBackground: true,
    preferCSSPageSize: true,
  });

  await page.emulateMediaType("screen");

  return new Uint8Array(pdf);
}

async function closeBrowserSafely(
  browser: Browser | null
) {
  if (!browser) {
    return;
  }

  try {
    for (const page of await browser.pages()) {
      await page.close().catch(() => undefined);
    }

    await Promise.race([
      browser.close(),
      new Promise<void>((resolve) =>
        setTimeout(resolve, 5_000)
      ),
    ]);
  } catch (error) {
    console.error(
      "Chromium konnte nicht sauber geschlossen werden:",
      error
    );
  }
}

function getRegieberichtNumber(row: JsonRow) {
  return String(
    row.bericht_nr ||
      row.nummer ||
      row.id ||
      "Bericht"
  );
}

export async function POST(
  request: NextRequest
) {
  let browser: Browser | null = null;

  try {
    const expectedTestKey =
      requireEnvironmentVariable(
        "ARCHIVE_TEST_KEY"
      );

    const suppliedTestKey = request.headers
      .get("x-archive-test-key")
      ?.trim();

    if (
      !suppliedTestKey ||
      suppliedTestKey !== expectedTestKey
    ) {
      return jsonResponse(
        {
          success: false,
          error: "Zugriff nicht erlaubt.",
        },
        401
      );
    }

    let body: ArchiveRequestBody;

    try {
      body =
        (await request.json()) as ArchiveRequestBody;
    } catch {
      return jsonResponse(
        {
          success: false,
          error:
            "Der Request enthält kein gültiges JSON.",
        },
        400
      );
    }

    const baustelleId = String(
      body.baustelleId ?? ""
    ).trim();

    if (!/^\d+$/.test(baustelleId)) {
      return jsonResponse(
        {
          success: false,
          error: "baustelleId ist ungültig.",
        },
        400
      );
    }

    const supabaseUrl =
      requireEnvironmentVariable(
        "NEXT_PUBLIC_SUPABASE_URL"
      );

    const supabaseSecretKey =
      requireEnvironmentVariable(
        "SUPABASE_SECRET_KEY"
      );

    const clientId =
      requireEnvironmentVariable(
        "ONEDRIVE_CLIENT_ID"
      );

    const clientSecret =
      requireEnvironmentVariable(
        "ONEDRIVE_CLIENT_SECRET"
      );

    const redirectUri =
      requireEnvironmentVariable(
        "ONEDRIVE_REDIRECT_URI"
      );

    const tenant =
      process.env.ONEDRIVE_TENANT?.trim() ||
      "consumers";

    const encryptionKey =
      requireEnvironmentVariable(
        "ONEDRIVE_TOKEN_ENCRYPTION_KEY"
      );

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

    const {
      data: connection,
      error: connectionError,
    } = await supabaseAdmin
      .from("onedrive_connections")
      .select(
        `
        provider,
        drive_id,
        archive_folder_id,
        archive_folder_web_url,
        refresh_token_encrypted
        `
      )
      .eq("provider", "microsoft")
      .single();

    if (connectionError || !connection) {
      throw new Error(
        `Die OneDrive-Verbindung wurde nicht gefunden: ${
          connectionError?.message ||
          "kein Eintrag"
        }`
      );
    }

    const typedConnection =
      connection as OneDriveConnection;

    if (
      !typedConnection.drive_id ||
      !typedConnection.archive_folder_id
    ) {
      throw new Error(
        "OneDrive drive_id oder archive_folder_id fehlt."
      );
    }

    const token =
      await refreshMicrosoftAccessToken(
        typedConnection.refresh_token_encrypted,
        encryptionKey,
        clientId,
        clientSecret,
        tenant,
        redirectUri
      );

    if (token.refreshTokenChanged) {
      const {
        error: tokenUpdateError,
      } = await supabaseAdmin
        .from("onedrive_connections")
        .update({
          refresh_token_encrypted:
            encryptRefreshToken(
              token.refreshToken,
              encryptionKey
            ),

          token_expires_at: new Date(
            Date.now() +
              token.expiresIn * 1000
          ).toISOString(),

          updated_at:
            new Date().toISOString(),
        })
        .eq("provider", "microsoft");

      if (tokenUpdateError) {
        throw new Error(
          `Der neue Microsoft-Refresh-Token konnte nicht gespeichert werden: ${tokenUpdateError.message}`
        );
      }
    }

    const {
      data: baustelleData,
      error: baustelleError,
    } = await supabaseAdmin
      .from("baustellen")
      .select("*")
      .eq("id", Number(baustelleId))
      .single();

    if (
      baustelleError ||
      !baustelleData
    ) {
      throw new Error(
        `Baustelle wurde nicht gefunden: ${
          baustelleError?.message ||
          baustelleId
        }`
      );
    }

    const baustelle =
      baustelleData as BaustelleRow;

    if (
      String(
        baustelle.status || ""
      ).trim() !== "Archiv"
    ) {
      throw new Error(
        "Der Export ist nur für Baustellen mit dem Status Archiv erlaubt."
      );
    }

    const rooms =
      await loadRowsByEqual(
        supabaseAdmin,
        "prostorije",
        "baustelle_id",
        Number(baustelleId)
      );

    const roomIds = rooms
      .map((row) => row.id)
      .filter(Boolean);

    const regieberichte =
      await loadRowsByEqual(
        supabaseAdmin,
        "regieberichte",
        "baustelle_id",
        Number(baustelleId)
      );

    const regieberichtIds =
      regieberichte
        .map((row) => row.id)
        .filter(Boolean);

    const projektRegie =
      await loadRowsByEqual(
        supabaseAdmin,
        "projekt_regie",
        "baustelle_id",
        baustelleId
      );

    const projektRegieIds =
      projektRegie
        .map((row) => row.id)
        .filter(Boolean);

    const [
      roomPhotosByBaustelle,
      roomPhotosByRoom,
      regieberichtPhotos,
      baustelleInfoPhotos,
      fotos,
      regieFotos,
      projektFotos,
      arbeitsinfoFiles,
    ] = await Promise.all([
      loadRowsByEqual(
        supabaseAdmin,
        "room_photos",
        "baustelle_id",
        baustelleId
      ),

      loadRowsByIn(
        supabaseAdmin,
        "room_photos",
        "room_id",
        roomIds
      ),

      loadRowsByIn(
        supabaseAdmin,
        "regiebericht_photos",
        "regiebericht_id",
        regieberichtIds
      ),

      loadRowsByEqual(
        supabaseAdmin,
        "baustelle_info_photos",
        "baustelle_id",
        Number(baustelleId)
      ),

      loadRowsByEqual(
        supabaseAdmin,
        "fotos",
        "baustelle_id",
        baustelleId
      ),

      loadRowsByEqual(
        supabaseAdmin,
        "regie_fotos",
        "baustelle_id",
        baustelleId
      ),

      loadRowsByIn(
        supabaseAdmin,
        "projekt_fotos",
        "regie_id",
        projektRegieIds
      ),

      loadRowsByEqual(
        supabaseAdmin,
        "arbeitsinfo_files",
        "baustelle_id",
        Number(baustelleId)
      ),
    ]);

    const fileCandidates =
      collectFileCandidates([
        {
          table: "room_photos",
          rows: uniqueRows([
            ...roomPhotosByBaustelle,
            ...roomPhotosByRoom,
          ]),
        },

        {
          table: "regiebericht_photos",
          rows: regieberichtPhotos,
        },

        {
          table: "baustelle_info_photos",
          rows: baustelleInfoPhotos,
        },

        {
          table: "fotos",
          rows: fotos,
        },

        {
          table: "regie_fotos",
          rows: regieFotos,
        },

        {
          table: "projekt_fotos",
          rows: projektFotos,
        },

        {
          table: "arbeitsinfo_files",
          rows: arbeitsinfoFiles,
        },
      ]);

    const baustelleName =
      sanitizeOneDriveName(
        String(
          baustelle.naziv ||
            `Baustelle ${baustelleId}`
        ),
        `Baustelle ${baustelleId}`
      );

    const baustelleFolder =
      await ensureOneDriveFolder(
        typedConnection.drive_id,
        typedConnection.archive_folder_id,
        baustelleName,
        token.accessToken
      );

    const fotosFolder =
      await ensureOneDriveFolder(
        typedConnection.drive_id,
        baustelleFolder.id,
        "Fotos",
        token.accessToken
      );

    const regieberichteFolder =
      await ensureOneDriveFolder(
        typedConnection.drive_id,
        baustelleFolder.id,
        "Regieberichte",
        token.accessToken
      );

    const appOrigin =
      new URL(request.url).origin;

    browser = await createBrowser();

    const page =
      await createAdminPage(browser);

    const overviewPdf =
      await renderPdf(
        page,
        `${appOrigin}/baustellen/archiv/${encodeURIComponent(
          baustelleId
        )}?onedriveExport=1`,
        "Baustellenübersicht",
        [
          "Bericht wird geladen",
          "Zugriff wird geprüft",
        ]
      );

    const overviewItem =
      await uploadOneDriveFile(
        typedConnection.drive_id,
        baustelleFolder.id,
        "Baustellenübersicht.pdf",
        overviewPdf,
        "application/pdf",
        token.accessToken
      );

    const uploadedRegieberichte: Array<{
      id: string;
      name: string;
      itemId: string;
    }> = [];

    const sortedRegieberichte = [
      ...regieberichte,
    ].sort((a, b) =>
      String(a.datum || "").localeCompare(
        String(b.datum || "")
      )
    );

    for (
      const bericht of sortedRegieberichte
    ) {
      const regieId =
        String(bericht.id);

      const regieNumber =
        sanitizeOneDriveName(
          getRegieberichtNumber(bericht),
          regieId
        );

      const regiePdf =
        await renderPdf(
          page,
          `${appOrigin}/baustellen/archiv/${encodeURIComponent(
            baustelleId
          )}/regieberichte/${encodeURIComponent(
            regieId
          )}?onedriveExport=1`,
          "Tagesbericht / Regiearbeit",
          [
            "Regiebericht wird geladen",
            "Zugriff wird geprüft",
          ]
        );

      const targetName =
        `Regiebericht-${regieNumber}.pdf`;

      const uploadedItem =
        await uploadOneDriveFile(
          typedConnection.drive_id,
          regieberichteFolder.id,
          targetName,
          regiePdf,
          "application/pdf",
          token.accessToken
        );

      uploadedRegieberichte.push({
        id: regieId,
        name: uploadedItem.name,
        itemId: uploadedItem.id,
      });
    }

    const {
      data: buckets,
      error: bucketsError,
    } =
      await supabaseAdmin.storage.listBuckets();

    if (bucketsError) {
      throw new Error(
        `Storage-Buckets konnten nicht geladen werden: ${bucketsError.message}`
      );
    }

    const bucketIds =
      (buckets ?? []).map(
        (bucket: { id: string }) =>
          bucket.id
      );

    const supabaseHost =
      new URL(supabaseUrl).hostname;

    let uploadedPhotoCount = 0;

    let uploadedPdfAttachmentCount = 0;

    const failedFiles: Array<{
      reference: string;
      error: string;
    }> = [];

    for (
      let index = 0;
      index < fileCandidates.length;
      index += 1
    ) {
      const candidate =
        fileCandidates[index];

      try {
        const downloaded =
          await downloadFileCandidate(
            supabaseAdmin,
            candidate,
            bucketIds,
            supabaseHost
          );

        const isPdf =
          downloaded.contentType
            .toLowerCase()
            .includes(
              "application/pdf"
            ) ||
          downloaded.originalName
            .toLowerCase()
            .endsWith(".pdf");

        if (isPdf) {
          const targetName =
            sanitizeOneDriveName(
              `Anlage-${String(
                uploadedPdfAttachmentCount +
                  1
              ).padStart(
                3,
                "0"
              )}-${downloaded.originalName}`,
              `Anlage-${
                uploadedPdfAttachmentCount +
                1
              }.pdf`
            );

          await uploadOneDriveFile(
            typedConnection.drive_id,
            regieberichteFolder.id,
            targetName,
            downloaded.bytes,
            downloaded.contentType ||
              "application/pdf",
            token.accessToken
          );

          uploadedPdfAttachmentCount += 1;

          continue;
        }

        if (
          !downloaded.contentType
            .toLowerCase()
            .startsWith("image/")
        ) {
          continue;
        }

        const targetName =
          sanitizeOneDriveName(
            `Foto-${String(
              uploadedPhotoCount + 1
            ).padStart(
              3,
              "0"
            )}-${
              downloaded.originalName
            }`,
            `Foto-${
              uploadedPhotoCount + 1
            }.jpg`
          );

        await uploadOneDriveFile(
          typedConnection.drive_id,
          fotosFolder.id,
          targetName,
          downloaded.bytes,
          downloaded.contentType,
          token.accessToken
        );

        uploadedPhotoCount += 1;
      } catch (error) {
        failedFiles.push({
          reference:
            candidate.reference,

          error:
            error instanceof Error
              ? error.message
              : String(error),
        });
      }
    }

    if (failedFiles.length > 0) {
      throw new Error(
        `${failedFiles.length} Datei(en) konnten nicht übertragen werden. Aus Supabase wurde nichts gelöscht. Erste Fehlerursache: ${failedFiles[0].error}`
      );
    }

    const rootChildren =
      await graphJson<GraphChildrenResponse>(
        `https://graph.microsoft.com/v1.0/drives/${encodeURIComponent(
          typedConnection.drive_id
        )}/items/${encodeURIComponent(
          baustelleFolder.id
        )}/children?$select=id,name,size,webUrl,folder,file`,
        token.accessToken
      );

    const rootNames = new Set(
      (rootChildren.value ?? []).map(
        (item) => item.name
      )
    );

    if (
      !rootNames.has(
        "Baustellenübersicht.pdf"
      ) ||
      !rootNames.has("Fotos") ||
      !rootNames.has("Regieberichte")
    ) {
      throw new Error(
        "Die abschließende OneDrive-Ordnerprüfung ist fehlgeschlagen."
      );
    }

    return jsonResponse({
      success: true,
      mode: "test-no-delete",

      message:
        "Der vereinfachte OneDrive-Export wurde erfolgreich abgeschlossen. Aus Supabase wurde noch nichts gelöscht.",

      deletedFromSupabase: false,

      baustelle: {
        id: baustelle.id,
        naziv: baustelle.naziv,
        lokacija: baustelle.lokacija,
      },

      folder: {
        id: baustelleFolder.id,
        name: baustelleFolder.name,
        webUrl:
          baustelleFolder.webUrl ??
          null,
      },

      overviewPdf: {
        id: overviewItem.id,
        name: overviewItem.name,
        size:
          overviewItem.size ??
          overviewPdf.byteLength,
      },

      files: {
        photos: uploadedPhotoCount,

        regieberichte:
          uploadedRegieberichte.length,

        pdfAttachments:
          uploadedPdfAttachmentCount,

        failed: 0,
      },
    });
  } catch (error) {
    console.error(
      "Fehler beim vereinfachten OneDrive-Export:",
      error
    );

    return jsonResponse(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : String(error),

        deletedFromSupabase: false,
      },
      500
    );
  } finally {
    await closeBrowserSafely(browser);
  }
}
import { createDecipheriv, createCipheriv, createHash, randomBytes } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

type JsonRow = Record<string, unknown>;
type TableBundle = Record<string, JsonRow[]>;
type SupabaseAdminClient = ReturnType<typeof createClient<any>>;

type BaustelleRow = JsonRow & {
  id: string | number;
  naziv?: string | null;
  lokacija?: string | null;
  status?: string | null;
};

type ArchiveRequestBody = {
  baustelleId?: string | number;
};

type OneDriveConnection = {
  provider: string;
  drive_id: string | null;
  archive_folder_id: string | null;
  archive_folder_web_url: string | null;
  refresh_token_encrypted: string;
};

type MicrosoftRefreshResponse = {
  token_type?: string;
  scope?: string;
  expires_in?: number;
  access_token?: string;
  refresh_token?: string;
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
  rowIndex: number;
  fieldPath: string;
  reference: string;
};

type DownloadedFile = {
  bytes: Uint8Array;
  contentType: string;
  originalName: string;
  bucketId?: string;
  storagePath?: string;
};

type UploadedFileResult = {
  sourceTable: string;
  fieldPath: string;
  originalReference: string;
  onedriveItemId: string;
  onedriveName: string;
  onedriveWebUrl: string | null;
  size: number;
  sha256: string;
};

type FailedFileResult = {
  sourceTable: string;
  fieldPath: string;
  originalReference: string;
  error: string;
};

const DIRECT_BAUSTELLE_TABLES = [
  "arbeitsinfo_files",
  "arbeitsinfo_materials",
  "arbeitsinfo_notes",
  "arbeitsinfo_tasks",
  "arbeitsinfo_tiles",
  "arbeitsinfo_tools",
  "arbeitszeiten",
  "aufgaben",
  "baustelle_hours",
  "baustelle_info",
  "baustelle_info_photos",
  "baustelle_material",
  "fotos",
  "leistungen",
  "material_bewegungen",
  "material_entries",
  "material_orders",
  "positionen",
  "private_notes",
  "produktivnost",
  "projekt_regie",
  "prostorije",
  "raeume",
  "regie",
  "regie_arbeiter",
  "regie_fotos",
  "regie_unterschriften",
  "regieberichte",
  "room_photos",
  "tagesberichte",
  "work_calendar",
] as const;

const FILE_FIELDS = new Set([
  "file_url",
  "photo_url",
  "foto_url",
  "image_url",
  "bild_url",
  "public_url",
  "storage_path",
  "file_path",
  "pdf_url",
  "qr_url",
  "signature_url",
  "unterschrift_url",
  "schein_url",
]);

const GENERIC_URL_FILE_TABLES = new Set(["fotos", "regie_fotos"]);

const FILE_EXTENSION_RE =
  /\.(jpe?g|png|webp|gif|heic|heif|svg|pdf|docx?|xlsx?|csv|txt|zip|mp4|mov|avi|mkv)(?:$|\?)/i;

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

function decryptRefreshToken(payload: string, encryptionKeyHex: string): string {
  if (!/^[a-f0-9]{64}$/i.test(encryptionKeyHex)) {
    throw new Error(
      "ONEDRIVE_TOKEN_ENCRYPTION_KEY muss genau 64 hexadezimale Zeichen enthalten."
    );
  }

  const [version, ivPart, tagPart, encryptedPart] = payload.split(".");

  if (version !== "v1" || !ivPart || !tagPart || !encryptedPart) {
    throw new Error("Das Format des verschlüsselten OneDrive-Tokens ist ungültig.");
  }

  const key = Buffer.from(encryptionKeyHex, "hex");
  const iv = Buffer.from(ivPart, "base64url");
  const authenticationTag = Buffer.from(tagPart, "base64url");
  const encrypted = Buffer.from(encryptedPart, "base64url");

  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authenticationTag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

function encryptRefreshToken(refreshToken: string, encryptionKeyHex: string) {
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

function sanitizeOneDriveName(value: string, fallback: string) {
  const cleaned = value
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/[\u0000-\u001f]/g, "")
    .replace(/\s+/g, " ")
    .replace(/[. ]+$/g, "")
    .trim();

  return (cleaned || fallback).slice(0, 120);
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

function uniqueValues(values: unknown[]) {
  return [
    ...new Set(
      values
        .filter((value) => value !== null && value !== undefined && value !== "")
        .map((value) => String(value))
    ),
  ];
}

function uniqueRows(rows: JsonRow[]) {
  const result: JsonRow[] = [];
  const seen = new Set<string>();

  for (const row of rows) {
    const key =
      row.id !== null && row.id !== undefined
        ? `id:${String(row.id)}`
        : JSON.stringify(row);

    if (seen.has(key)) continue;
    seen.add(key);
    result.push(row);
  }

  return result;
}

function collectIds(rows: JsonRow[], column = "id") {
  return uniqueValues(rows.map((row) => row[column]));
}

function mergeTableRows(bundle: TableBundle, table: string, rows: JsonRow[]) {
  bundle[table] = uniqueRows([...(bundle[table] ?? []), ...rows]);
}

async function loadRowsByEqual(
  supabaseAdmin: SupabaseAdminClient,
  table: string,
  column: string,
  value: string | number
) {
  const rows: JsonRow[] = [];
  const pageSize = 1000;

  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabaseAdmin
      .from(table)
      .select("*")
      .eq(column, value)
      .range(offset, offset + pageSize - 1);

    if (error) {
      throw new Error(`${table}.${column}: ${error.message}`);
    }

    const page = (data ?? []) as JsonRow[];
    rows.push(...page);

    if (page.length < pageSize) break;
  }

  return uniqueRows(rows);
}

async function loadRowsByIn(
  supabaseAdmin: SupabaseAdminClient,
  table: string,
  column: string,
  values: string[]
) {
  if (values.length === 0) return [];

  const rows: JsonRow[] = [];

  for (const part of chunkArray(values, 100)) {
    const pageSize = 1000;

    for (let offset = 0; ; offset += pageSize) {
      const { data, error } = await supabaseAdmin
        .from(table)
        .select("*")
        .in(column, part)
        .range(offset, offset + pageSize - 1);

      if (error) {
        throw new Error(`${table}.${column}: ${error.message}`);
      }

      const page = (data ?? []) as JsonRow[];
      rows.push(...page);

      if (page.length < pageSize) break;
    }
  }

  return uniqueRows(rows);
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

  const tokenData = (await response.json()) as MicrosoftRefreshResponse;

  if (!response.ok || !tokenData.access_token) {
    throw new Error(
      `Microsoft-Tokenfehler: ${
        tokenData.error_description || tokenData.error || response.status
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
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Microsoft Graph ${response.status}: ${errorText}`);
  }

  return (await response.json()) as T;
}

async function createOneDriveFolder(
  driveId: string,
  parentItemId: string,
  folderName: string,
  accessToken: string
) {
  return graphJson<GraphDriveItem>(
    `https://graph.microsoft.com/v1.0/drives/${encodeURIComponent(
      driveId
    )}/items/${encodeURIComponent(parentItemId)}/children`,
    accessToken,
    {
      method: "POST",
      body: JSON.stringify({
        name: folderName,
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
  const encodedName = encodeURIComponent(fileName);
  const body = new Uint8Array(bytes).buffer;

  const response = await fetch(
    `https://graph.microsoft.com/v1.0/drives/${encodeURIComponent(
      driveId
    )}/items/${encodeURIComponent(parentItemId)}:/${encodedName}:/content`,
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
    throw new Error(`OneDrive upload ${response.status}: ${errorText}`);
  }

  const item = (await response.json()) as GraphDriveItem;

  if (typeof item.size === "number" && item.size !== bytes.byteLength) {
    throw new Error(
      `Die Dateigröße auf OneDrive stimmt nicht überein: ${item.size} / ${bytes.byteLength}`
    );
  }

  return item;
}

async function uploadJsonFile(
  driveId: string,
  parentItemId: string,
  fileName: string,
  value: unknown,
  accessToken: string
) {
  const bytes = new TextEncoder().encode(JSON.stringify(value, null, 2));

  return uploadOneDriveFile(
    driveId,
    parentItemId,
    fileName,
    bytes,
    "application/json; charset=utf-8",
    accessToken
  );
}

function isFileField(sourceTable: string, keyName: string) {
  const normalized = keyName.trim().toLowerCase();

  if (FILE_FIELDS.has(normalized)) return true;

  return (
    normalized === "url" &&
    GENERIC_URL_FILE_TABLES.has(sourceTable.toLowerCase())
  );
}

function looksLikeFileReference(value: string) {
  const trimmed = value.trim();

  if (!trimmed) return false;
  if (/^data:[^;]+;base64,/i.test(trimmed)) return true;
  if (/^https?:\/\//i.test(trimmed)) return true;
  return FILE_EXTENSION_RE.test(trimmed);
}

function collectFileCandidates(bundle: TableBundle) {
  const candidates: FileCandidate[] = [];
  const seen = new Set<string>();

  function visit(
    sourceTable: string,
    rowIndex: number,
    fieldPath: string,
    keyName: string,
    value: unknown
  ) {
    if (typeof value === "string") {
      if (!isFileField(sourceTable, keyName) || !looksLikeFileReference(value)) {
        return;
      }

      const reference = value.trim();
      const dedupeKey = reference.replace(/[?#].*$/, "");

      if (seen.has(dedupeKey)) return;
      seen.add(dedupeKey);

      candidates.push({
        sourceTable,
        rowIndex,
        fieldPath,
        reference,
      });

      return;
    }

    if (Array.isArray(value)) {
      value.forEach((entry, index) =>
        visit(
          sourceTable,
          rowIndex,
          `${fieldPath}[${index}]`,
          keyName,
          entry
        )
      );
      return;
    }

    if (value && typeof value === "object") {
      for (const [nestedKey, nestedValue] of Object.entries(
        value as Record<string, unknown>
      )) {
        visit(
          sourceTable,
          rowIndex,
          fieldPath ? `${fieldPath}.${nestedKey}` : nestedKey,
          nestedKey,
          nestedValue
        );
      }
    }
  }

  for (const [table, rows] of Object.entries(bundle)) {
    rows.forEach((row, rowIndex) => {
      for (const [key, value] of Object.entries(row)) {
        visit(table, rowIndex, key, key, value);
      }
    });
  }

  return candidates;
}

function parseSupabaseStorageUrl(reference: string) {
  try {
    const url = new URL(reference);
    const match = url.pathname.match(
      /\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^/]+)\/(.+)$/
    );

    if (!match) return null;

    return {
      bucketId: decodeURIComponent(match[1]),
      storagePath: decodeURIComponent(match[2]),
    };
  } catch {
    return null;
  }
}

function getFileNameFromReference(reference: string, fallback: string) {
  try {
    const url = new URL(reference);
    const lastPart = url.pathname.split("/").filter(Boolean).pop();
    return sanitizeOneDriveName(
      lastPart ? decodeURIComponent(lastPart) : fallback,
      fallback
    );
  } catch {
    const lastPart = reference.split(/[\\/]/).filter(Boolean).pop();
    return sanitizeOneDriveName(lastPart || fallback, fallback);
  }
}

function parseDataUrl(reference: string) {
  const match = reference.match(/^data:([^;]+);base64,(.+)$/i);

  if (!match) return null;

  return {
    contentType: match[1] || "application/octet-stream",
    bytes: new Uint8Array(Buffer.from(match[2], "base64")),
  };
}

async function downloadFileCandidate(
  supabaseAdmin: SupabaseAdminClient,
  candidate: FileCandidate,
  bucketIds: string[],
  supabaseHost: string
): Promise<DownloadedFile> {
  const parsedDataUrl = parseDataUrl(candidate.reference);

  if (parsedDataUrl) {
    return {
      bytes: parsedDataUrl.bytes,
      contentType: parsedDataUrl.contentType,
      originalName: `embedded-${candidate.sourceTable}-${candidate.rowIndex}.bin`,
    };
  }

  const parsedStorageUrl = parseSupabaseStorageUrl(candidate.reference);

  if (parsedStorageUrl) {
    const { data, error } = await supabaseAdmin.storage
      .from(parsedStorageUrl.bucketId)
      .download(parsedStorageUrl.storagePath);

    if (error || !data) {
      throw new Error(
        `Der Download aus Supabase Storage ist fehlgeschlagen: ${error?.message || "keine Datei"}`
      );
    }

    return {
      bytes: new Uint8Array(await data.arrayBuffer()),
      contentType: data.type || "application/octet-stream",
      originalName: getFileNameFromReference(
        parsedStorageUrl.storagePath,
        "file.bin"
      ),
      bucketId: parsedStorageUrl.bucketId,
      storagePath: parsedStorageUrl.storagePath,
    };
  }

  if (/^https?:\/\//i.test(candidate.reference)) {
    const url = new URL(candidate.reference);

    if (url.hostname !== supabaseHost) {
      throw new Error(`Externe URL ist nicht erlaubt: ${url.hostname}`);
    }

    const response = await fetch(candidate.reference, {
      method: "GET",
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`HTTP download ${response.status}`);
    }

    return {
      bytes: new Uint8Array(await response.arrayBuffer()),
      contentType:
        response.headers.get("content-type") || "application/octet-stream",
      originalName: getFileNameFromReference(candidate.reference, "file.bin"),
    };
  }

  const cleanPath = candidate.reference.replace(/^\/+/, "");
  const firstPart = cleanPath.split("/")[0];

  const bucketOrder = bucketIds.includes(firstPart)
    ? [firstPart, ...bucketIds.filter((bucketId) => bucketId !== firstPart)]
    : bucketIds;

  for (const bucketId of bucketOrder) {
    const storagePath =
      bucketId === firstPart
        ? cleanPath.slice(firstPart.length).replace(/^\/+/, "")
        : cleanPath;

    const { data, error } = await supabaseAdmin.storage
      .from(bucketId)
      .download(storagePath);

    if (!error && data) {
      return {
        bytes: new Uint8Array(await data.arrayBuffer()),
        contentType: data.type || "application/octet-stream",
        originalName: getFileNameFromReference(storagePath, "file.bin"),
        bucketId,
        storagePath,
      };
    }
  }

  throw new Error("Die Datei wurde in keinem Supabase-Storage-Bucket gefunden.");
}

async function loadBaustelleBundle(
  supabaseAdmin: SupabaseAdminClient,
  baustelleId: string
) {
  const { data: baustelle, error: baustelleError } = await supabaseAdmin
    .from("baustellen")
    .select("*")
    .eq("id", baustelleId)
    .single();

  if (baustelleError || !baustelle) {
    throw new Error(
      `Baustelle wurde nicht gefunden: ${baustelleError?.message || baustelleId}`
    );
  }

  const typedBaustelle = baustelle as BaustelleRow;

  if (String(typedBaustelle.status ?? "").trim() !== "Archiv") {
    throw new Error("Der Export ist nur für Baustellen mit dem Status Archiv erlaubt.");
  }

  const bundle: TableBundle = {
    baustellen: [typedBaustelle],
  };

  const directResults = await Promise.all(
    DIRECT_BAUSTELLE_TABLES.map(async (table) => ({
      table,
      rows: await loadRowsByEqual(
        supabaseAdmin,
        table,
        "baustelle_id",
        baustelleId
      ),
    }))
  );

  for (const result of directResults) {
    mergeTableRows(bundle, result.table, result.rows);
  }

  const roomIds = uniqueValues([
    ...collectIds(bundle.prostorije ?? []),
    ...collectIds(bundle.raeume ?? []),
    ...(bundle.baustelle_info ?? []).map((row) => row.room_id),
    ...(bundle.arbeitsinfo_tasks ?? []).map((row) => row.room_id),
  ]);

  const roomDependentQueries = [
    {
      table: "arbeitsinfo_tile_rooms",
      column: "room_id",
      values: roomIds,
    },
    {
      table: "prostorije_materijal",
      column: "prostorija_id",
      values: roomIds,
    },
    {
      table: "room_material",
      column: "room_id",
      values: roomIds,
    },
  ];

  for (const query of roomDependentQueries) {
    const rows = await loadRowsByIn(
      supabaseAdmin,
      query.table,
      query.column,
      query.values
    );
    mergeTableRows(bundle, query.table, rows);
  }

  const regieberichtIds = collectIds(bundle.regieberichte ?? []);

  for (const table of [
    "regiebericht_materials",
    "regiebericht_photos",
    "regiebericht_rooms",
    "regiebericht_workers",
  ]) {
    const rows = await loadRowsByIn(
      supabaseAdmin,
      table,
      "regiebericht_id",
      regieberichtIds
    );
    mergeTableRows(bundle, table, rows);
  }

  const projektRegieIds = collectIds(bundle.projekt_regie ?? []);

  for (const table of ["projekt_fotos", "projekt_regie_workers"]) {
    const rows = await loadRowsByIn(
      supabaseAdmin,
      table,
      "regie_id",
      projektRegieIds
    );
    mergeTableRows(bundle, table, rows);
  }

  const materialIds = uniqueValues(
    Object.values(bundle).flatMap((rows) =>
      rows.map((row) => row.material_id)
    )
  );

  const materials = await loadRowsByIn(
    supabaseAdmin,
    "materials",
    "id",
    materialIds
  );
  mergeTableRows(bundle, "materials", materials);

  const materialGroupIds = uniqueValues(
    materials.map((row) => row.group_id)
  );

  const materialGroups = await loadRowsByIn(
    supabaseAdmin,
    "material_groups",
    "id",
    materialGroupIds
  );
  mergeTableRows(bundle, "material_groups", materialGroups);

  return {
    baustelle: typedBaustelle,
    bundle,
  };
}

export async function POST(request: NextRequest) {
  try {
    const expectedTestKey = requireEnvironmentVariable("ARCHIVE_TEST_KEY");
    const suppliedTestKey = request.headers.get("x-archive-test-key")?.trim();

    if (!suppliedTestKey || suppliedTestKey !== expectedTestKey) {
      return jsonResponse({ error: "Zugriff nicht erlaubt." }, 401);
    }

    const body = (await request.json()) as ArchiveRequestBody;
    const baustelleId = String(body.baustelleId ?? "").trim();

    if (!/^\d+$/.test(baustelleId)) {
      return jsonResponse({ error: "baustelleId ist ungültig." }, 400);
    }

    const supabaseUrl = requireEnvironmentVariable("NEXT_PUBLIC_SUPABASE_URL");
    const supabaseSecretKey = requireEnvironmentVariable(
      "SUPABASE_SECRET_KEY"
    );
    const clientId = requireEnvironmentVariable("ONEDRIVE_CLIENT_ID");
    const clientSecret = requireEnvironmentVariable("ONEDRIVE_CLIENT_SECRET");
    const redirectUri = requireEnvironmentVariable("ONEDRIVE_REDIRECT_URI");
    const tenant = process.env.ONEDRIVE_TENANT?.trim() || "consumers";
    const encryptionKey = requireEnvironmentVariable(
      "ONEDRIVE_TOKEN_ENCRYPTION_KEY"
    );

    const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });

    const { data: connection, error: connectionError } = await supabaseAdmin
      .from("onedrive_connections")
      .select(
        "provider, drive_id, archive_folder_id, archive_folder_web_url, refresh_token_encrypted"
      )
      .eq("provider", "microsoft")
      .single();

    if (connectionError || !connection) {
      throw new Error(
        `Die OneDrive-Verbindung wurde nicht gefunden: ${connectionError?.message || "kein Eintrag"}`
      );
    }

    const typedConnection = connection as OneDriveConnection;

    if (!typedConnection.drive_id || !typedConnection.archive_folder_id) {
      throw new Error("OneDrive drive_id oder archive_folder_id fehlt.");
    }

    const token = await refreshMicrosoftAccessToken(
      typedConnection.refresh_token_encrypted,
      encryptionKey,
      clientId,
      clientSecret,
      tenant,
      redirectUri
    );

    if (token.refreshTokenChanged) {
      const { error: updateTokenError } = await supabaseAdmin
        .from("onedrive_connections")
        .update({
          refresh_token_encrypted: encryptRefreshToken(
            token.refreshToken,
            encryptionKey
          ),
          token_expires_at: new Date(
            Date.now() + token.expiresIn * 1000
          ).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("provider", "microsoft");

      if (updateTokenError) {
        throw new Error(
          `Der neue Microsoft-Refresh-Token konnte nicht gespeichert werden: ${updateTokenError.message}`
        );
      }
    }

    const { baustelle, bundle } = await loadBaustelleBundle(
      supabaseAdmin,
      baustelleId
    );

    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, "-");
    const baustelleName = String(baustelle.naziv || `Baustelle ${baustelleId}`);
    const archiveFolderName = sanitizeOneDriveName(
      `TEST - ${baustelleId} - ${baustelleName} - ${timestamp}`,
      `TEST - Baustelle ${baustelleId}`
    );

    const archiveFolder = await createOneDriveFolder(
      typedConnection.drive_id,
      typedConnection.archive_folder_id,
      archiveFolderName,
      token.accessToken
    );

    const dataFolder = await createOneDriveFolder(
      typedConnection.drive_id,
      archiveFolder.id,
      "Daten",
      token.accessToken
    );

    const filesFolder = await createOneDriveFolder(
      typedConnection.drive_id,
      archiveFolder.id,
      "Dateien",
      token.accessToken
    );

    const tableCounts = Object.fromEntries(
      Object.entries(bundle)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([table, rows]) => [table, rows.length])
    );

    const fileCandidates = collectFileCandidates(bundle);

    const dataExport = {
      schemaVersion: 1,
      exportMode: "test-no-delete",
      exportedAt: now.toISOString(),
      source: {
        supabaseProjectUrl: supabaseUrl,
        baustelleId,
      },
      baustelle,
      tableCounts,
      tables: bundle,
      discoveredFileReferences: fileCandidates,
    };

    const dataItem = await uploadJsonFile(
      typedConnection.drive_id,
      dataFolder.id,
      "Baustelle-Daten.json",
      dataExport,
      token.accessToken
    );

    const { data: buckets, error: bucketsError } =
      await supabaseAdmin.storage.listBuckets();

    if (bucketsError) {
      throw new Error(`Fehler beim Laden der Storage-Bucket-Liste: ${bucketsError.message}`);
    }

    const bucketIds = (buckets ?? []).map((bucket: { id: string }) => bucket.id);
    const supabaseHost = new URL(supabaseUrl).hostname;
    const uploadedFiles: UploadedFileResult[] = [];
    const failedFiles: FailedFileResult[] = [];
    const uploadedStorageKeys = new Set<string>();

    for (let index = 0; index < fileCandidates.length; index += 1) {
      const candidate = fileCandidates[index];

      try {
        const downloaded = await downloadFileCandidate(
          supabaseAdmin,
          candidate,
          bucketIds,
          supabaseHost
        );

        const storageKey =
          downloaded.bucketId && downloaded.storagePath
            ? `${downloaded.bucketId}/${downloaded.storagePath}`
            : null;

        if (storageKey && uploadedStorageKeys.has(storageKey)) {
          continue;
        }

        if (downloaded.bytes.byteLength > 240 * 1024 * 1024) {
          throw new Error(
            "Die Datei ist größer als 240 MB; dafür ist eine Upload-Session erforderlich."
          );
        }

        const prefix = `${String(index + 1).padStart(4, "0")}-${sanitizeOneDriveName(
          candidate.sourceTable,
          "table"
        )}`;

        const targetName = sanitizeOneDriveName(
          `${prefix}-${downloaded.originalName}`,
          `${prefix}-file.bin`
        );

        const uploadedItem = await uploadOneDriveFile(
          typedConnection.drive_id,
          filesFolder.id,
          targetName,
          downloaded.bytes,
          downloaded.contentType,
          token.accessToken
        );

        if (storageKey) {
          uploadedStorageKeys.add(storageKey);
        }

        uploadedFiles.push({
          sourceTable: candidate.sourceTable,
          fieldPath: candidate.fieldPath,
          originalReference: candidate.reference,
          onedriveItemId: uploadedItem.id,
          onedriveName: uploadedItem.name,
          onedriveWebUrl: uploadedItem.webUrl ?? null,
          size: downloaded.bytes.byteLength,
          sha256: createHash("sha256")
            .update(downloaded.bytes)
            .digest("hex"),
        });
      } catch (error) {
        failedFiles.push({
          sourceTable: candidate.sourceTable,
          fieldPath: candidate.fieldPath,
          originalReference: candidate.reference,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const readyForDeletion = failedFiles.length === 0;

    const manifest = {
      schemaVersion: 1,
      exportMode: "test-no-delete",
      exportedAt: now.toISOString(),
      readyForDeletion,
      deletedFromSupabase: false,
      baustelle: {
        id: baustelle.id,
        naziv: baustelle.naziv,
        lokacija: baustelle.lokacija,
        status: baustelle.status,
      },
      onedrive: {
        driveId: typedConnection.drive_id,
        parentArchiveFolderId: typedConnection.archive_folder_id,
        folderId: archiveFolder.id,
        folderName: archiveFolder.name,
        folderWebUrl: archiveFolder.webUrl ?? null,
        dataItemId: dataItem.id,
      },
      database: {
        tableCounts,
        totalRows: Object.values(bundle).reduce(
          (sum, rows) => sum + rows.length,
          0
        ),
      },
      files: {
        discovered: fileCandidates.length,
        uploaded: uploadedFiles.length,
        failed: failedFiles.length,
        uploadedItems: uploadedFiles,
        failedItems: failedFiles,
      },
    };

    const manifestItem = await uploadJsonFile(
      typedConnection.drive_id,
      archiveFolder.id,
      "Archiv-Manifest.json",
      manifest,
      token.accessToken
    );

    const children = await graphJson<GraphChildrenResponse>(
      `https://graph.microsoft.com/v1.0/drives/${encodeURIComponent(
        typedConnection.drive_id
      )}/items/${encodeURIComponent(
        archiveFolder.id
      )}/children?$select=id,name,size,webUrl,folder,file`,
      token.accessToken
    );

    const rootNames = new Set((children.value ?? []).map((item) => item.name));

    if (
      !rootNames.has("Daten") ||
      !rootNames.has("Dateien") ||
      !rootNames.has("Archiv-Manifest.json")
    ) {
      throw new Error("Die abschließende OneDrive-Ordnerprüfung ist fehlgeschlagen.");
    }

    return jsonResponse({
      success: true,
      mode: "test-no-delete",
      message: readyForDeletion
        ? "Der Testexport ist vollständig. Aus Supabase wurde nichts gelöscht."
        : "Der Testexport wurde abgeschlossen, aber einige Dateien wurden nicht übertragen. Es wurde nichts gelöscht.",
      readyForDeletion,
      deletedFromSupabase: false,
      baustelleId,
      folder: {
        id: archiveFolder.id,
        name: archiveFolder.name,
        webUrl: archiveFolder.webUrl ?? null,
      },
      manifest: {
        id: manifestItem.id,
        webUrl: manifestItem.webUrl ?? null,
      },
      tableCounts,
      files: {
        discovered: fileCandidates.length,
        uploaded: uploadedFiles.length,
        failed: failedFiles,
      },
    });
  } catch (error) {
    console.error("Fehler beim OneDrive-Testarchiv der Baustelle:", error);

    return jsonResponse(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        deletedFromSupabase: false,
      },
      500
    );
  }
}
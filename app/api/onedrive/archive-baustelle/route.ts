import { createClient } from "@supabase/supabase-js";
import chromium from "@sparticuz/chromium-min";
import JSZip from "jszip";
import puppeteer, { type Browser, type Page } from "puppeteer-core";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

type JsonRow = Record<string, any>;

type DownloadedFile = {
  bytes: Uint8Array;
  contentType: string;
  fileName: string;
};

const PHOTO_URL_FIELDS = [
  "photo_url",
  "foto_url",
  "image_url",
  "bild_url",
  "public_url",
  "file_url",
  "url",
  "storage_path",
  "file_path",
  "path",
] as const;

function requiredEnvironmentVariable(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Fehlende Umgebungsvariable: ${name}`);
  }

  return value;
}

function sanitizeFileName(value: string, fallback: string) {
  const cleaned = String(value || "")
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/[\u0000-\u001f]/g, "")
    .replace(/\s+/g, " ")
    .replace(/[. ]+$/g, "")
    .trim();

  return (cleaned || fallback).slice(0, 140);
}

function getPhotoReference(row: JsonRow) {
  for (const field of PHOTO_URL_FIELDS) {
    const value = row?.[field];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function isPdfReference(reference: string) {
  return String(reference || "")
    .toLowerCase()
    .split(/[?#]/)[0]
    .endsWith(".pdf");
}

function isImageContentType(contentType: string) {
  return String(contentType || "").toLowerCase().startsWith("image/");
}

function extensionFromContentType(contentType: string) {
  const normalized = String(contentType || "")
    .toLowerCase()
    .split(";")[0]
    .trim();

  const extensions: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "image/heic": ".heic",
    "image/heif": ".heif",
    "application/pdf": ".pdf",
  };

  return extensions[normalized] || "";
}

function getFileNameFromReference(reference: string, fallback: string) {
  try {
    const url = new URL(reference);
    const lastPart = url.pathname.split("/").filter(Boolean).pop();

    return sanitizeFileName(
      lastPart ? decodeURIComponent(lastPart) : fallback,
      fallback,
    );
  } catch {
    const lastPart = String(reference || "")
      .split(/[\\/]/)
      .filter(Boolean)
      .pop();

    return sanitizeFileName(lastPart || fallback, fallback);
  }
}

function ensureFileExtension(fileName: string, contentType: string) {
  if (/\.[a-z0-9]{2,6}$/i.test(fileName)) return fileName;
  return `${fileName}${extensionFromContentType(contentType) || ".bin"}`;
}

function parseStorageUrl(reference: string) {
  try {
    const url = new URL(reference);
    const match = url.pathname.match(
      /\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^/]+)\/(.+)$/,
    );

    if (!match) return null;

    return {
      bucket: decodeURIComponent(match[1]),
      path: decodeURIComponent(match[2]),
    };
  } catch {
    return null;
  }
}

function parseDataUrl(reference: string) {
  const match = String(reference || "").match(/^data:([^;]+);base64,(.+)$/i);

  if (!match) return null;

  return {
    contentType: match[1] || "application/octet-stream",
    bytes: new Uint8Array(Buffer.from(match[2], "base64")),
  };
}

async function downloadFile(
  supabaseAdmin: any,
  reference: string,
  bucketIds: string[],
  index: number,
): Promise<DownloadedFile> {
  const dataUrl = parseDataUrl(reference);

  if (dataUrl) {
    const fallback = `Datei-${String(index + 1).padStart(3, "0")}`;

    return {
      bytes: dataUrl.bytes,
      contentType: dataUrl.contentType,
      fileName: ensureFileExtension(fallback, dataUrl.contentType),
    };
  }

  const parsedStorage = parseStorageUrl(reference);

  if (parsedStorage) {
    const { data, error } = await supabaseAdmin.storage
      .from(parsedStorage.bucket)
      .download(parsedStorage.path);

    if (error || !data) {
      throw new Error(
        `Storage-Datei konnte nicht geladen werden: ${error?.message || reference}`,
      );
    }

    const contentType = data.type || "application/octet-stream";

    return {
      bytes: new Uint8Array(await data.arrayBuffer()),
      contentType,
      fileName: ensureFileExtension(
        getFileNameFromReference(parsedStorage.path, `Datei-${index + 1}`),
        contentType,
      ),
    };
  }

  if (/^https?:\/\//i.test(reference)) {
    const response = await fetch(reference, {
      method: "GET",
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Datei konnte nicht geladen werden: HTTP ${response.status}`);
    }

    const contentType =
      response.headers.get("content-type") || "application/octet-stream";

    return {
      bytes: new Uint8Array(await response.arrayBuffer()),
      contentType,
      fileName: ensureFileExtension(
        getFileNameFromReference(reference, `Datei-${index + 1}`),
        contentType,
      ),
    };
  }

  const cleanPath = String(reference || "").replace(/^\/+/, "");
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
      const contentType = data.type || "application/octet-stream";

      return {
        bytes: new Uint8Array(await data.arrayBuffer()),
        contentType,
        fileName: ensureFileExtension(
          getFileNameFromReference(storagePath, `Datei-${index + 1}`),
          contentType,
        ),
      };
    }
  }

  throw new Error(`Datei wurde im Storage nicht gefunden: ${reference}`);
}

async function optionalRows(
  supabaseAdmin: any,
  table: string,
  column: string,
  value: string | number | Array<string | number>,
): Promise<JsonRow[]> {
  let query = supabaseAdmin.from(table).select("*");

  if (Array.isArray(value)) {
    if (value.length === 0) return [];
    query = query.in(column, value);
  } else {
    query = query.eq(column, value);
  }

  const { data, error } = await query;

  if (error) {
    console.warn(`Tabelle ${table} konnte nicht gelesen werden:`, error.message);
    return [];
  }

  return (data || []) as JsonRow[];
}

function uniqueRows(rows: JsonRow[]) {
  const seen = new Set<string>();

  return rows.filter((row) => {
    const key = `${String(row.id ?? "")}:${getPhotoReference(row)}`;

    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const CHROMIUM_PACK_URL =
  "https://github.com/Sparticuz/chromium/releases/download/v140.0.0/chromium-v140.0.0-pack.x64.tar";

async function createBrowser() {
  const executablePath = process.env.VERCEL
    ? await chromium.executablePath(CHROMIUM_PACK_URL)
    : process.env.LOCAL_CHROME_PATH ||
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

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
    executablePath,
    headless: "shell",
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

  await page.evaluateOnNewDocument((serializedAdmin: string) => {
    try {
      const keys = [
        "currentWorker",
        "worker",
        "loggedWorker",
        "selectedWorker",
        "currentUser",
        "loggedUser",
        "user",
        "loginUser",
        "baustelle_user",
        "stone_user",
        "app_user",
      ];

      for (const key of keys) {
        localStorage.setItem(key, serializedAdmin);
      }
    } catch {
      // Die Seite setzt Local Storage nach dem Laden erneut.
    }
  }, adminValue);

  return page;
}

async function waitForReport(page: Page) {
  await page.waitForFunction(
    () => {
      const text = document.body?.innerText || "";

      if (!text || text.length < 100) return false;
      if (text.includes("Zugriff wird geprüft")) return false;
      if (text.includes("Bericht wird geladen")) return false;
      if (text.includes("Regiebericht wird geladen")) return false;
      if (text.includes("Kein Zugriff")) return false;

      return true;
    },
    { timeout: 90_000 },
  );

  await page.evaluate(async () => {
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;

    if (fonts?.ready) {
      await fonts.ready;
    }

    const images = Array.from(document.images);

    await Promise.race([
      Promise.all(
        images.map(
          (image) =>
            new Promise<void>((resolve) => {
              if (image.complete) {
                resolve();
                return;
              }

              image.addEventListener("load", () => resolve(), { once: true });
              image.addEventListener("error", () => resolve(), { once: true });
            }),
        ),
      ),
      new Promise<void>((resolve) => window.setTimeout(resolve, 15_000)),
    ]);
  });
}

async function renderPdf(page: Page, url: string) {
  const response = await page.goto(url, {
    waitUntil: "networkidle2",
    timeout: 90_000,
  });

  if (!response || !response.ok()) {
    throw new Error(
      `PDF-Seite konnte nicht geladen werden: ${response?.status() || "keine Antwort"}`,
    );
  }

  await waitForReport(page);
  await page.emulateMediaType("print");

  const pdf = await page.pdf({
    format: "A4",
    printBackground: true,
    preferCSSPageSize: true,
    margin: {
      top: "0mm",
      right: "0mm",
      bottom: "0mm",
      left: "0mm",
    },
  });

  await page.emulateMediaType("screen");

  return new Uint8Array(pdf);
}

async function closeBrowser(browser: Browser | null) {
  if (!browser) return;

  try {
    await browser.close();
  } catch (error) {
    console.error("Browser konnte nicht geschlossen werden:", error);
  }
}

function getRegieberichtNumber(row: JsonRow) {
  return sanitizeFileName(
    String(row.bericht_nr || row.nummer || row.id || "Bericht"),
    String(row.id || "Bericht"),
  );
}

function getRoomName(room: JsonRow | undefined, roomId: string | number) {
  return sanitizeFileName(
    String(
      room?.naziv ||
        room?.name ||
        room?.room ||
        room?.prostorija ||
        `Raum-${roomId}`,
    ),
    `Raum-${roomId}`,
  );
}

export async function GET(request: NextRequest) {
  let browser: Browser | null = null;

  try {
    const baustelleId = request.nextUrl.searchParams.get("baustelleId")?.trim();
    const archivedBy =
      request.nextUrl.searchParams.get("archivedBy")?.trim() || "Admin";

    if (!baustelleId || !/^\d+$/.test(baustelleId)) {
      return NextResponse.json(
        { success: false, error: "baustelleId ist ungültig." },
        { status: 400 },
      );
    }

    const supabaseUrl = requiredEnvironmentVariable("NEXT_PUBLIC_SUPABASE_URL");
    const supabaseSecretKey = requiredEnvironmentVariable("SUPABASE_SECRET_KEY");

    const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });

    const { data: baustelle, error: baustelleError } = await supabaseAdmin
      .from("baustellen")
      .select("*")
      .eq("id", Number(baustelleId))
      .single();

    if (baustelleError || !baustelle) {
      throw new Error(
        `Baustelle wurde nicht gefunden: ${baustelleError?.message || baustelleId}`,
      );
    }

    if (String(baustelle.status || "").trim() !== "Archiv") {
      throw new Error("Der ZIP-Export ist nur für archivierte Baustellen erlaubt.");
    }

    const rooms = await optionalRows(
      supabaseAdmin,
      "prostorije",
      "baustelle_id",
      Number(baustelleId),
    );

    const roomIds = rooms
      .map((room) => room.id)
      .filter((id) => id !== null && id !== undefined);

    const roomPhotosByRoom = await optionalRows(
      supabaseAdmin,
      "room_photos",
      "room_id",
      roomIds,
    );

    const roomPhotosByBaustelle = await optionalRows(
      supabaseAdmin,
      "room_photos",
      "baustelle_id",
      baustelleId,
    );

    const regieberichte = await optionalRows(
      supabaseAdmin,
      "regieberichte",
      "baustelle_id",
      Number(baustelleId),
    );

    const regieberichtIds = regieberichte
      .map((bericht) => bericht.id)
      .filter((id) => id !== null && id !== undefined);

    const regieberichtPhotos = await optionalRows(
      supabaseAdmin,
      "regiebericht_photos",
      "regiebericht_id",
      regieberichtIds,
    );

    const baustelleInfoPhotos = await optionalRows(
      supabaseAdmin,
      "baustelle_info_photos",
      "baustelle_id",
      Number(baustelleId),
    );

    const legacyPhotos = await optionalRows(
      supabaseAdmin,
      "fotos",
      "baustelle_id",
      baustelleId,
    );

    const legacyRegiePhotos = await optionalRows(
      supabaseAdmin,
      "regie_fotos",
      "baustelle_id",
      baustelleId,
    );

    const { data: buckets, error: bucketsError } =
      await supabaseAdmin.storage.listBuckets();

    if (bucketsError) {
      throw new Error(`Storage-Buckets konnten nicht geladen werden: ${bucketsError.message}`);
    }

    const bucketIds = (buckets || []).map((bucket: { id: string }) => bucket.id);

    const zip = new JSZip();
    const rootName = sanitizeFileName(
      String(baustelle.naziv || `Baustelle-${baustelleId}`),
      `Baustelle-${baustelleId}`,
    );

    const root = zip.folder(rootName);

    if (!root) {
      throw new Error("ZIP-Hauptordner konnte nicht erstellt werden.");
    }

    browser = await createBrowser();
    const page = await createAdminPage(browser);
    const appOrigin = request.nextUrl.origin;

    const overviewPdf = await renderPdf(
      page,
      `${appOrigin}/baustellen/archiv/${encodeURIComponent(baustelleId)}?zipExport=1`,
    );

    root.file("Baustellenübersicht.pdf", overviewPdf, {
      binary: true,
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });

    const sortedRegieberichte = [...regieberichte].sort((a, b) =>
      String(a.datum || "").localeCompare(String(b.datum || "")),
    );

    for (const bericht of sortedRegieberichte) {
      const berichtId = String(bericht.id);
      const berichtNumber = getRegieberichtNumber(bericht);
      const regiePdf = await renderPdf(
        page,
        `${appOrigin}/baustellen/archiv/${encodeURIComponent(
          baustelleId,
        )}/regieberichte/${encodeURIComponent(berichtId)}?zipExport=1`,
      );

      root.file(`Regieberichte/Regiebericht-${berichtNumber}.pdf`, regiePdf, {
        binary: true,
        compression: "DEFLATE",
        compressionOptions: { level: 6 },
      });
    }

    const roomById = new Map<string, JsonRow>(
      rooms.map((room) => [String(room.id), room]),
    );

    const roomPhotos = uniqueRows([
      ...roomPhotosByRoom,
      ...roomPhotosByBaustelle,
    ]).filter((row) => !isPdfReference(getPhotoReference(row)));

    let photoCounter = 0;

    for (const row of roomPhotos) {
      const reference = getPhotoReference(row);
      if (!reference) continue;

      const downloaded = await downloadFile(
        supabaseAdmin,
        reference,
        bucketIds,
        photoCounter,
      );

      if (!isImageContentType(downloaded.contentType)) continue;

      const roomId = String(row.room_id || row.prostorija_id || "ohne-raum");
      const roomName =
        roomId === "ohne-raum"
          ? "Ohne Raum"
          : getRoomName(roomById.get(roomId), roomId);

      const targetName = sanitizeFileName(
        `Bild-${String(photoCounter + 1).padStart(3, "0")}-${downloaded.fileName}`,
        `Bild-${String(photoCounter + 1).padStart(3, "0")}.jpg`,
      );

      root.file(`Bilder/${roomName}/${targetName}`, downloaded.bytes, {
        binary: true,
        compression: "STORE",
      });

      photoCounter += 1;
    }

    const generalPhotoRows = uniqueRows([
      ...baustelleInfoPhotos,
      ...legacyPhotos,
    ]).filter((row) => !isPdfReference(getPhotoReference(row)));

    for (const row of generalPhotoRows) {
      const reference = getPhotoReference(row);
      if (!reference) continue;

      const downloaded = await downloadFile(
        supabaseAdmin,
        reference,
        bucketIds,
        photoCounter,
      );

      if (!isImageContentType(downloaded.contentType)) continue;

      const targetName = sanitizeFileName(
        `Bild-${String(photoCounter + 1).padStart(3, "0")}-${downloaded.fileName}`,
        `Bild-${String(photoCounter + 1).padStart(3, "0")}.jpg`,
      );

      root.file(`Bilder/Allgemein/${targetName}`, downloaded.bytes, {
        binary: true,
        compression: "STORE",
      });

      photoCounter += 1;
    }

    let regieImageCounter = 0;
    let regieAttachmentCounter = 0;

    for (const row of uniqueRows(regieberichtPhotos)) {
      const reference = getPhotoReference(row);
      if (!reference) continue;

      const bericht = regieberichte.find(
        (item) => Number(item.id) === Number(row.regiebericht_id),
      );

      const berichtNumber = getRegieberichtNumber(
        bericht || { id: row.regiebericht_id || "Ohne-Nummer" },
      );

      const downloaded = await downloadFile(
        supabaseAdmin,
        reference,
        bucketIds,
        regieImageCounter + regieAttachmentCounter,
      );

      if (
        isPdfReference(reference) ||
        downloaded.contentType.toLowerCase().includes("application/pdf")
      ) {
        const targetName = sanitizeFileName(
          `Anlage-${String(regieAttachmentCounter + 1).padStart(3, "0")}-${downloaded.fileName}`,
          `Anlage-${String(regieAttachmentCounter + 1).padStart(3, "0")}.pdf`,
        );

        root.file(
          `Regieberichte/Regiebericht-${berichtNumber}/Anlagen/${targetName}`,
          downloaded.bytes,
          {
            binary: true,
            compression: "STORE",
          },
        );

        regieAttachmentCounter += 1;
        continue;
      }

      if (!isImageContentType(downloaded.contentType)) continue;

      const targetName = sanitizeFileName(
        `Bild-${String(regieImageCounter + 1).padStart(3, "0")}-${downloaded.fileName}`,
        `Bild-${String(regieImageCounter + 1).padStart(3, "0")}.jpg`,
      );

      root.file(
        `Regieberichte/Regiebericht-${berichtNumber}/Bilder/${targetName}`,
        downloaded.bytes,
        {
          binary: true,
          compression: "STORE",
        },
      );

      regieImageCounter += 1;
    }

    for (const row of uniqueRows(legacyRegiePhotos)) {
      const reference = getPhotoReference(row);
      if (!reference) continue;

      const downloaded = await downloadFile(
        supabaseAdmin,
        reference,
        bucketIds,
        regieImageCounter + regieAttachmentCounter,
      );

      const targetFolder = isPdfReference(reference)
        ? "Regieberichte/Weitere Anlagen"
        : "Regieberichte/Weitere Bilder";

      const targetName = sanitizeFileName(
        downloaded.fileName,
        `Datei-${regieImageCounter + regieAttachmentCounter + 1}`,
      );

      root.file(`${targetFolder}/${targetName}`, downloaded.bytes, {
        binary: true,
        compression: "STORE",
      });

      if (isPdfReference(reference)) {
        regieAttachmentCounter += 1;
      } else {
        regieImageCounter += 1;
      }
    }

    await closeBrowser(browser);
    browser = null;

    const zipBuffer = await zip.generateAsync({
      type: "nodebuffer",
      compression: "STORE",
      streamFiles: true,
    });

    const zipFileName = `${rootName}.zip`;
    const asciiFileName = sanitizeFileName(
      zipFileName.normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
      `Baustelle-${baustelleId}.zip`,
    ).replace(/[^\x20-\x7E]/g, "-");

    const archivedAt = new Date().toISOString();

    const { error: archiveMetadataError } = await supabaseAdmin
      .from("baustellen")
      .update({
        archived_file_at: archivedAt,
        archived_file_by: archivedBy,
        archive_method: "zip",
      })
      .eq("id", Number(baustelleId));

    if (archiveMetadataError) {
      throw new Error(
        `Archivdatum konnte nicht gespeichert werden: ${archiveMetadataError.message}`,
      );
    }

    return new NextResponse(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${asciiFileName}"; filename*=UTF-8''${encodeURIComponent(
          zipFileName,
        )}`,
        "Cache-Control": "no-store, max-age=0",
        "X-Archive-Photos": String(photoCounter + regieImageCounter),
        "X-Archive-Regieberichte": String(regieberichte.length),
        "X-Archive-At": archivedAt,
        "X-Archive-By": archivedBy,
      },
    });
  } catch (error) {
    console.error("Fehler beim ZIP-Export der Baustelle:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  } finally {
    await closeBrowser(browser);
  }
}
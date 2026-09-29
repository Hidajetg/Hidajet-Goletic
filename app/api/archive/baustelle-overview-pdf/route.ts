import chromium from "@sparticuz/chromium-min";
import puppeteer, { type Browser, type Page } from "puppeteer-core";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const CHROMIUM_PACK_URL =
  process.env.CHROMIUM_PACK_URL ||
  "https://github.com/Sparticuz/chromium/releases/download/v140.0.0/chromium-v140.0.0-pack.x64.tar";

function getAdminLocalStorageValue() {
  return JSON.stringify({
    name: "Hido",
    role: "admin",
    is_admin: true,
    admin: true,
  });
}

async function createBrowser(): Promise<Browser> {
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
    protocolTimeout: 240_000,
  });
}

async function prepareAdminPage(browser: Browser): Promise<Page> {
  const page = await browser.newPage();

  page.setDefaultNavigationTimeout(120_000);
  page.setDefaultTimeout(120_000);

  await page.setCacheEnabled(false);

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
        "userName",
        "workerName",
        "name",
        "loginUser",
        "baustelle_user",
        "stone_user",
        "app_user",
      ];

      for (const key of keys) {
        localStorage.setItem(key, serializedAdmin);
      }
    } catch {
      // Local Storage će biti dostupan nakon otvaranja stranice.
    }
  }, getAdminLocalStorageValue());

  return page;
}

async function waitForReport(page: Page) {
  await page.waitForFunction(
    () => {
      const text = document.body?.innerText || "";

      if (text.length < 100) return false;
      if (text.includes("Zugriff wird geprüft")) return false;
      if (text.includes("Bericht wird geladen")) return false;
      if (text.includes("Kein Zugriff")) return false;

      return Boolean(document.querySelector("section.print-box"));
    },
    { timeout: 120_000 },
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
      new Promise<void>((resolve) => window.setTimeout(resolve, 25_000)),
    ]);

    window.scrollTo(0, 0);
  });

  await new Promise((resolve) => setTimeout(resolve, 750));
}

async function createOverviewPdf(page: Page, pageUrl: string) {
  const response = await page.goto(pageUrl, {
    waitUntil: "networkidle2",
    timeout: 120_000,
  });

  if (!response || !response.ok()) {
    throw new Error(
      `Baustellenübersicht konnte nicht geladen werden (${response?.status() || "keine Antwort"}).`,
    );
  }

  await waitForReport(page);
  await page.emulateMediaType("print");

  const pdf = await page.pdf({
    format: "A4",
    printBackground: true,
    preferCSSPageSize: true,
    scale: 1,
    timeout: 180_000,
    margin: {
      top: "0mm",
      right: "0mm",
      bottom: "0mm",
      left: "0mm",
    },
  });

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

export async function GET(request: NextRequest) {
  let browser: Browser | null = null;

  try {
    const baustelleId = request.nextUrl.searchParams
      .get("baustelleId")
      ?.trim();

    if (!baustelleId || !/^\d+$/.test(baustelleId)) {
      return NextResponse.json(
        {
          success: false,
          error: "baustelleId ist ungültig.",
        },
        { status: 400 },
      );
    }

    browser = await createBrowser();
    const page = await prepareAdminPage(browser);

    const reportUrl = `${request.nextUrl.origin}/baustellen/archiv/${encodeURIComponent(
      baustelleId,
    )}?zipPdfExport=1`;

    const pdf = await createOverviewPdf(page, reportUrl);

    await page.close();
    await closeBrowser(browser);
    browser = null;

    return new NextResponse(pdf, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="Baustellenuebersicht-${baustelleId}.pdf"`,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error("Fehler beim PDF-Export der Baustellenübersicht:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          "Die Baustellenübersicht konnte nicht als PDF erstellt werden: " +
          (error instanceof Error ? error.message : String(error)),
      },
      { status: 500 },
    );
  } finally {
    await closeBrowser(browser);
  }
}
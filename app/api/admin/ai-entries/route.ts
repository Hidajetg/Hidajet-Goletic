import { NextRequest, NextResponse } from "next/server";
import { getChatUser } from "../../../lib/team-chat";
import { supabaseAdmin } from "../../../lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };
async function requireAdmin() {
  const user = await getChatUser();
  return user?.isAdmin ? user : null;
}
function sameOrigin(req: NextRequest) {
  return req.headers.get("origin") === req.nextUrl.origin;
}
export async function GET() {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Samo administrator." }, { status: 403, headers });
  const [sites, entries] = await Promise.all([
    supabaseAdmin.from("baustellen").select("id,naziv,lokacija,status").order("naziv", { ascending: true }).limit(500),
    supabaseAdmin.from("baustelle_ai_info")
      .select("id,baustelle_id,kind,status,title,source_text,created_by,created_at,updated_at")
      .order("created_at", { ascending: false }).limit(150),
  ]);
  if (sites.error || entries.error) {
    console.error("Admin AI info lookup failed", sites.error?.message || entries.error?.message);
    return NextResponse.json({ error: "AI unosi trenutno nisu dostupni." }, { status: 503, headers });
  }
  return NextResponse.json({ sites: sites.data, entries: entries.data }, { headers });
}
export async function POST(req: NextRequest) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Samo administrator." }, { status: 403, headers });
  if (!sameOrigin(req)) return NextResponse.json({ error: "Neispravan zahtjev." }, { status: 403, headers });
  let body: any;
  try {body = await req.json();} catch { return NextResponse.json({ error: "Neispravan unos." }, { status: 400, headers }); }
  const siteId = Number(body?.siteId);
  const title = String(body?.title ?? "").trim();
  const sourceText = String(body?.sourceText ?? "").trim();
  const kind = body?.kind === "angebot" ? "angebot" : "note";
  // Published entries can be read by workers through existing AI site content.
  // All new items start as drafts until the admin reviews them separately.
  if (!Number.isSafeInteger(siteId) || siteId <= 0 || title.length < 2 || title.length > 180 || !sourceText || sourceText.length > 12000) {
    return NextResponse.json({ error: "Odaberi gradilište i unesi naslov (2–180) te opis (1–12000)." }, { status: 400, headers });
  }
  const { data: site, error: se } = await supabaseAdmin.from("baustellen").select("id").eq("id", siteId).maybeSingle();
  if (se || !site) return NextResponse.json({ error: "Gradilište nije pronađeno." }, { status: 404, headers });
  const { data, error } = await supabaseAdmin.from("baustelle_ai_info").insert({
    baustelle_id: siteId,
    kind,
    status: "draft",
    title,
    source_text: sourceText,
    created_by: user.name,
  }).select("id,status").single();
  if (error) {
    console.error("Admin AI info insert failed", error.message);
    return NextResponse.json({ error: "Unos nije spremljen." }, { status: 503, headers });
  }
  return NextResponse.json({ created: data }, { status: 201, headers });
}

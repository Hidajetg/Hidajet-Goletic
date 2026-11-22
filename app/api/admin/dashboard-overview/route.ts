import { NextRequest, NextResponse } from "next/server";
import { getVerifiedAdmin } from "../../../lib/verified-dashboard-admin";
import { supabaseAdmin } from "../../../lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "private, no-store" };
const dateOnly = /^\d{4}-\d{2}-\d{2}$/;

function viennaDate() {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Vienna", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
}
function advance(iso: string, days: number) {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
function monday(iso: string) {
  const day = new Date(iso + "T12:00:00Z").getUTCDay();
  return advance(iso, day === 0 ? -6 : 1 - day);
}
export async function GET(req: NextRequest) {
  const session = await getVerifiedAdmin();
  if (!session) return NextResponse.json({ error: "Prijava je istekla." }, { status: 401, headers: noStore });
  const today = viennaDate();
  const param = req.nextUrl.searchParams.get("start");
  let start = monday(today);
  if (param !== null) {
    if (!dateOnly.test(param) || Number.isNaN(Date.parse(param + "T12:00:00Z"))) {
      return NextResponse.json({ error: "Neispravan datum." }, { status: 400, headers: noStore });
    }
    if (Math.abs(Date.parse(param) - Date.parse(today)) > 100 * 86_400_000) {
      return NextResponse.json({ error: "Prikaz je ograničen na 100 dana." }, { status: 400, headers: noStore });
    }
    start = monday(param);
  }
  const end = advance(start, 5);
  try {
    // Include all four source categories from the original "Današnja dodavanja" panel.
    // Read records around local Vienna day boundaries to handle DST safely.
    const windowStart = advance(today, -1) + "T18:00:00Z";
    const windowEnd = advance(today, 1) + "T07:00:00Z";
    const [calendar, sites, workers, questions, aiInfo, hours, docs, photosDay, hoursDay, workDay, materialDay] = await Promise.all([
      supabaseAdmin.from("work_calendar")
        .select("id,datum,worker_name,baustelle_id,napomena")
        .gte("datum", start).lte("datum", end)
        .order("datum", { ascending: true }).order("worker_name", { ascending: true }).limit(1500),
      supabaseAdmin.from("baustellen").select("id,naziv,lokacija").limit(500),
      supabaseAdmin.from("workers").select("id,name,active,role").eq("active", true).limit(500),
      supabaseAdmin.from("ai_chat_conversations")
        .select("id,worker_name,last_question,last_message_at").order("last_message_at", { ascending: false }).limit(12),
      supabaseAdmin.from("baustelle_ai_info").select("id,baustelle_id,status,title,created_at")
        .order("created_at", { ascending: false }).limit(12),
      supabaseAdmin.from("baustelle_hours")
        .select("id,radnik,datum,baustelle_id,created_at,opis_posla")
        .order("created_at", { ascending: false }).limit(8),
      supabaseAdmin.from("bau_dokumentation")
        .select("id,baustelle_id,titel,erstellt_von,created_at")
        .order("created_at", { ascending: false }).limit(8),
      supabaseAdmin.from("room_photos")
        .select("id,baustelle_id,worker_name,radnik,room_name,created_at")
        .gte("created_at", windowStart).lt("created_at", windowEnd)
        .order("created_at", { ascending: false }).limit(300),
      supabaseAdmin.from("baustelle_hours")
        .select("id,baustelle_id,radnik,opis_posla,ukupno_sati,sati,created_at")
        .gte("created_at", windowStart).lt("created_at", windowEnd)
        .order("created_at", { ascending: false }).limit(300),
      supabaseAdmin.from("produktivnost")
        .select("id,baustelle_id,radnik,posao,pozicija,kolicina,jedinica,created_at")
        .gte("created_at", windowStart).lt("created_at", windowEnd)
        .order("created_at", { ascending: false }).limit(300),
      supabaseAdmin.from("baustelle_material")
        .select("id,baustelle_id,materijal,custom_naziv,kolicina,jedinica,created_at")
        .gte("created_at", windowStart).lt("created_at", windowEnd)
        .order("created_at", { ascending: false }).limit(300),
    ]);
    if (calendar.error || sites.error || workers.error) {
      console.error("Admin home calendar failed", calendar.error?.message || sites.error?.message || workers.error?.message);
      return NextResponse.json({ error: "Pregled rasporeda trenutno nije dostupan." }, { status: 503, headers: noStore });
    }
    const byId = new Map((sites.data ?? []).map(s => [String(s.id), s]));
    const week = Array.from({ length: 6 }, (_, i) => advance(start, i));
    const rows = (calendar.data ?? []).map(x => ({
      id: String(x.id), date: x.datum, worker: x.worker_name,
      siteId: x.baustelle_id === null ? null : String(x.baustelle_id),
      site: byId.get(String(x.baustelle_id))?.naziv ?? "Baustelle",
      location: byId.get(String(x.baustelle_id))?.lokacija ?? "",
      note: x.napomena ?? "",
    }));
    const activity = [
      ...(hours.data ?? []).map(h => ({
        id: "h-" + h.id, type: "hours", at: h.created_at, actor: h.radnik,
        title: "Radni sati", detail: h.opis_posla || h.datum || "",
        site: byId.get(String(h.baustelle_id))?.naziv || "Baustelle",
      })),
      ...(docs.data ?? []).map(d => ({
        id: "d-" + d.id, type: "documentation", at: d.created_at, actor: d.erstellt_von,
        title: "Bau-Dokumentation", detail: d.titel ?? "",
        site: byId.get(String(d.baustelle_id))?.naziv || "Baustelle",
      })),
    ].sort((a,b) => Date.parse(b.at || "0") - Date.parse(a.at || "0")).slice(0,10);
    const todayLocal = (timestamp: string | null) => {
      if (!timestamp) return false;
      const dt = new Date(timestamp);
      return !Number.isNaN(dt.valueOf()) &&
        new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Vienna" }).format(dt) === today;
    };
    const photos = (photosDay.data ?? []).filter(a => todayLocal(a.created_at));
    const workHours = (hoursDay.data ?? []).filter(a => todayLocal(a.created_at));
    const production = (workDay.data ?? []).filter(a => todayLocal(a.created_at));
    const materials = (materialDay.data ?? []).filter(a => todayLocal(a.created_at));
    const dailyActivities = [
      ...photos.map(p => ({
        id: "photo-" + p.id, type: "photo", at: p.created_at,
        actor: p.worker_name || p.radnik || "", site: byId.get(String(p.baustelle_id))?.naziv ?? "Baustelle",
        siteId: p.baustelle_id,
        title: "Neue Fotos", detail: p.room_name ?? "",
      })),
      ...workHours.map(h => ({
        id: "hours-" + h.id, type: "hours", at: h.created_at,
        actor: h.radnik ?? "", site: byId.get(String(h.baustelle_id))?.naziv ?? "Baustelle",
        siteId: h.baustelle_id,
        title: "Uneseni radni sati", detail: h.opis_posla || ((h.ukupno_sati ?? h.sati ?? "") + " h"),
      })),
      ...production.map(p => ({
        id: "work-" + p.id, type: "work", at: p.created_at,
        actor: p.radnik ?? "", site: byId.get(String(p.baustelle_id))?.naziv ?? "Baustelle",
        siteId: p.baustelle_id,
        title: "Produktivität", detail: p.posao || p.pozicija || "",
      })),
      ...materials.map(m => ({
        id: "material-" + m.id, type: "material", at: m.created_at,
        actor: "", site: byId.get(String(m.baustelle_id))?.naziv ?? "Baustelle",
        siteId: m.baustelle_id,
        title: "Material", detail: m.custom_naziv || m.materijal || "",
      })),
    ].sort((a,b) => Date.parse(b.at || "0") - Date.parse(a.at || "0")).slice(0,30);
    return NextResponse.json({
      week, start, end, today, rows,
      dayCounts: { photo: photos.length, hours: workHours.length, work: production.length, material: materials.length },
      dailyActivities,
      workerCount: (workers.data ?? []).filter(w => w.role !== "admin").length,
      aiQuestions: questions.error ? [] : (questions.data ?? []).map(q => ({
        id: q.id, worker: q.worker_name, question: q.last_question, at: q.last_message_at,
      })),
      aiInfo: aiInfo.error ? [] : (aiInfo.data ?? []).map(q => ({
        id: q.id, site: byId.get(String(q.baustelle_id))?.naziv ?? "Baustelle",
        title: q.title, status: q.status, at: q.created_at,
      })),
      activities: activity,
    }, { headers: noStore });
  } catch (error) {
    console.error("Admin overview failed", error);
    return NextResponse.json({ error: "Pregled nije dostupan." }, { status: 503, headers: noStore });
  }
}

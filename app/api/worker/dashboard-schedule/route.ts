import { NextRequest, NextResponse } from "next/server";
import { getVerifiedAppUser } from "../../../lib/verified-dashboard-admin";
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
function advance(date: string, days: number) {
  const d = new Date(date + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
function startOfWeek(date: string) {
  const day = new Date(date + "T12:00:00Z").getUTCDay();
  // On Sundays show the coming work week, as the original dashboard does.
  return advance(date, day === 0 ? 1 : 1 - day);
}
function normalizedName(name: unknown) {
  return String(name || "").trim().replace(/\s+/g, " ").toLocaleLowerCase("de-AT");
}

export async function GET(request: NextRequest) {
  const user = await getVerifiedAppUser();
  if (!user) {
    return NextResponse.json({ error: "Prijava je istekla." }, { status: 401, headers: noStore });
  }
  if (user.isAdmin) {
    return NextResponse.json({ error: "Administrator koristi administratorski raspored." }, { status: 403, headers: noStore });
  }
  const today = viennaDate();
  const input = request.nextUrl.searchParams.get("start");
  let start = startOfWeek(today);
  if (input !== null) {
    const parsed = new Date(input + "T12:00:00Z");
    if (!dateOnly.test(input) || !Number.isFinite(parsed.valueOf()) ||
        parsed.toISOString().slice(0, 10) !== input ||
        Math.abs(parsed.valueOf() - Date.parse(today + "T12:00:00Z")) > 100 * 86_400_000) {
      return NextResponse.json({ error: "Neispravan datum rasporeda." }, { status: 400, headers: noStore });
    }
    start = startOfWeek(input);
  }
  const end = advance(start, 5);
  try {
    // Only one selected week is read. This stays on the server with the
    // service role; unfiltered rows are NEVER returned to a worker.
    const { data, error } = await supabaseAdmin.from("work_calendar")
      .select("id,datum,worker_name,baustelle_id,napomena,start_time,end_time,task,priority,responsible_person,plan_status,team_note")
      .gte("datum", start).lte("datum", end)
      .order("datum", { ascending: true })
      .order("worker_name", { ascending: true })
      .limit(2000);
    if (error) throw error;
    const records = data ?? [];
    if (records.length === 2000) {
      // A partially loaded week could misrepresent permissions or the schedule.
      return NextResponse.json({ error: "Raspored je prevelik za prikaz." }, { status: 503, headers: noStore });
    }
    const currentName = normalizedName(user.name);
    const own = records.filter(row => normalizedName(row.worker_name) === currentName);
    const permittedPairs = new Set(own
      .filter(row => row.baustelle_id !== null)
      .map(row => row.datum + ":" + String(row.baustelle_id)));
    // A colleague is visible only on a date AND at a site to which this
    // exact worker is assigned. Their other sites/days remain hidden.
    const visible = records.filter(row =>
      normalizedName(row.worker_name) === currentName ||
      (row.baustelle_id !== null &&
       permittedPairs.has(row.datum + ":" + String(row.baustelle_id))));
    const siteIds = [...new Set(visible
      .map(row => Number(row.baustelle_id))
      .filter(id => Number.isSafeInteger(id) && id > 0))];
    let sites: { id: number; naziv: string; lokacija: string | null }[] = [];
    if (siteIds.length) {
      const result = await supabaseAdmin.from("baustellen")
        .select("id,naziv,lokacija").in("id", siteIds).limit(500);
      if (result.error) throw result.error;
      sites = result.data ?? [];
    }
    const byId = new Map(sites.map(s => [String(s.id), s]));
    return NextResponse.json({
      today, start, end,
      week: Array.from({ length: 6 }, (_, i) => advance(start, i)),
      currentWorker: user.name,
      rows: visible.map(row => ({
        id: String(row.id),
        date: row.datum,
        worker: row.worker_name,
        mine: normalizedName(row.worker_name) === currentName,
        siteId: row.baustelle_id === null ? null : String(row.baustelle_id),
        site: byId.get(String(row.baustelle_id))?.naziv ?? "Baustelle",
        location: byId.get(String(row.baustelle_id))?.lokacija ?? "",
        note: row.napomena ?? "",
        startTime: row.start_time ?? null, endTime: row.end_time ?? null,
        task: row.task ?? null, priority: row.priority ?? null,
        responsible: row.responsible_person ?? null, planStatus: row.plan_status ?? null,
        teamNote: row.team_note ?? null,
      })),
    }, { headers: noStore });
  } catch (error) {
    console.error("Worker dashboard calendar failed",
      error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "Raspored nije dostupan. Pokušaj ponovo." },
      { status: 503, headers: noStore });
  }
}

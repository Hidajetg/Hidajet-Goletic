import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase-admin";
import { getChatUser, currentViennaDate } from "../../../lib/team-chat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Worker-only home-screen schedule. Scope work_calendar by the verified worker
 * before looking up coworkers. No admin endpoint and no cross-site calendar
 * data are returned to a worker. This is safer than the legacy browser-side
 * .ilike('%worker_name%') filter and is independent of the public Data API.
 */
export async function GET(request: NextRequest) {
  const user = await getChatUser();
  if (!user) {
    return NextResponse.json({ error: "Prijava je istekla." }, {
      status: 401, headers: { "Cache-Control": "no-store" },
    });
  }
  if (user.isAdmin) {
    return NextResponse.json({ error: "Ovaj pregled je namijenjen radnicima." }, {
      status: 403, headers: { "Cache-Control": "no-store" },
    });
  }

  // Workers may browse their own schedule one day at a time. The server
  // validates Gregorian dates and caps the time window; it never accepts
  // worker_id, worker_name or role from a query parameter.
  const today = currentViennaDate();
  const requested = request.nextUrl.searchParams.get("date");
  const date = requested ?? today;
  const dayMs = 86_400_000;
  const parsed = Date.parse(date + "T00:00:00Z");
  const now = Date.parse(today + "T00:00:00Z");
  if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(date) ||
      !Number.isFinite(parsed) ||
      new Date(parsed).toISOString().slice(0, 10) !== date ||
      Math.abs(parsed - now) > 365 * dayMs) {
    return NextResponse.json({ error: "Odaberi ispravan datum unutar godine." }, {
      status: 400, headers: { "Cache-Control": "no-store" },
    });
  }
  try {
    const { data: ownRows, error: ownError } = await supabaseAdmin
      .from("work_calendar")
      .select("id, datum, worker_name, baustelle_id, napomena")
      .eq("datum", date)
      .eq("worker_name", user.name)
      .order("id", { ascending: true })
      .limit(30);
    if (ownError) throw ownError;

    const own = (ownRows ?? []).filter(row => row.baustelle_id !== null);
    const ids = Array.from(new Set(own.map(row => String(row.baustelle_id))));
    if (!ids.length) {
      return NextResponse.json({ date, sites: [] }, {
        headers: { "Cache-Control": "no-store" },
      });
    }

    const [
      { data: sites, error: siteError },
      { data: schedule, error: scheduleError },
    ] = await Promise.all([
      supabaseAdmin.from("baustellen")
        .select("id, naziv, lokacija")
        .in("id", ids)
        .limit(30),
      supabaseAdmin.from("work_calendar")
        .select("baustelle_id, worker_name")
        .eq("datum", date)
        .in("baustelle_id", ids)
        .order("worker_name", { ascending: true })
        .limit(200),
    ]);
    if (siteError || scheduleError) throw siteError || scheduleError;

    const details = new Map((sites ?? []).map(site => [String(site.id), site]));
    const coworkers = new Map<string, Set<string>>();
    for (const row of schedule ?? []) {
      const siteId = String(row.baustelle_id ?? "");
      // Rows were queried only from the authenticated worker's own sites.
      if (!ids.includes(siteId)) continue;
      const name = String(row.worker_name ?? "").trim();
      if (name && name.toLocaleLowerCase("de-AT") !== user.name.toLocaleLowerCase("de-AT")) {
        if (!coworkers.has(siteId)) coworkers.set(siteId, new Set());
        coworkers.get(siteId)!.add(name);
      }
    }

    return NextResponse.json({
      date,
      sites: own.map(row => {
        const siteId = String(row.baustelle_id);
        const site = details.get(siteId);
        return {
          id: String(row.id),
          siteId,
          name: String(site?.naziv ?? "Baustelle"),
          location: String(site?.lokacija ?? ""),
          note: String(row.napomena ?? ""),
          coworkers: Array.from(coworkers.get(siteId) ?? []),
        };
      }),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Worker home calendar load failed:", error);
    return NextResponse.json({ error: "Dnevni raspored trenutno nije dostupan." }, {
      status: 503, headers: { "Cache-Control": "no-store" },
    });
  }
}

import { NextResponse } from "next/server";

import { supabaseAdmin } from "../../../lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public login dropdown for the existing name + PIN screen.
 *
 * Expose ONLY the minimal fields necessary for choosing a worker.
 * Never return the full workers row (contacts/other personal fields),
 * PIN hashes, or any other data used for authorization.
 *
 * This endpoint is a transition step; the rest of the web app still needs
 * role-based server-side authorization before enabling strict RLS.
 */
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("workers")
      .select("id, name, role, active")
      .order("name", { ascending: true });

    if (error) {
      console.error("Worker login list query failed:", error.message);
      return NextResponse.json(
        { error: "Mitarbeiterliste konnte nicht geladen werden." },
        { status: 500, headers: { "Cache-Control": "no-store" } },
      );
    }

    const workers = (data ?? [])
      .filter((row) => row.active !== false)
      .map((row) => ({
        id: String(row.id),
        name: String(row.name ?? "").trim(),
        role: String(row.role ?? "").toLowerCase() === "admin" ? "admin" : "worker",
      }))
      .filter((row) => Boolean(row.name));

    return NextResponse.json(
      { workers },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Worker login list failed:", error);
    return NextResponse.json(
      { error: "Mitarbeiterliste konnte nicht geladen werden." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}

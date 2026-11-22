import { cookies } from "next/headers";
import { verifySessionToken } from "./admin-session";
import { supabaseAdmin } from "./supabase-admin";

/** The dashboard uses the ordinary signed app session, not the additional
 * PIN required for private Team Chat. Always check current DB role and active
 * status, and never trust client-provided role or worker identifiers. */
export async function getVerifiedAdmin() {
  const cookieStore = await cookies();
  const session = verifySessionToken(cookieStore.get("solstone_session")?.value);
  if (!session || session.role !== "admin" || !/^\d+$/.test(session.id)) return null;
  const { data, error } = await supabaseAdmin.from("workers")
    .select("id,name,role,active")
    .eq("id", Number(session.id)).maybeSingle();
  if (error || !data || data.active === false ||
      String(data.role).toLowerCase() !== "admin" ||
      String(data.name).trim().toLocaleLowerCase("de-AT") !== session.name.trim().toLocaleLowerCase("de-AT")) {
    return null;
  }
  return { id: String(data.id), name: String(data.name), role: "admin" as const };
}

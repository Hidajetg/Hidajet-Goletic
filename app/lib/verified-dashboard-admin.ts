import { cookies } from "next/headers";
import { verifySessionToken } from "./admin-session";
import { supabaseAdmin } from "./supabase-admin";

/** Verify the ordinary signed application session against the active worker
 * row. Team Chat's separate PIN remains mandatory only for private chat. */
export async function getVerifiedAppUser() {
  const cookieStore = await cookies();
  const session = verifySessionToken(cookieStore.get("solstone_session")?.value);
  if (!session || !/^\d+$/.test(session.id)) return null;
  const { data, error } = await supabaseAdmin.from("workers")
    .select("id,name,role,active")
    .eq("id", Number(session.id)).maybeSingle();
  if (error || !data || data.active === false ||
      !["worker", "admin"].includes(String(data.role).toLowerCase()) ||
      String(data.role).toLowerCase() !== session.role ||
      String(data.name).trim().toLocaleLowerCase("de-AT") !== session.name.trim().toLocaleLowerCase("de-AT")) {
    return null;
  }
  return { id: String(data.id), name: String(data.name),
    isAdmin: String(data.role).toLowerCase() === "admin" };
}
export async function getVerifiedAdmin() {
  const user = await getVerifiedAppUser();
  return user?.isAdmin ? { id: user.id, name: user.name, role: "admin" as const } : null;
}

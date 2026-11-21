import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { verifySessionToken } from "./admin-session";
import { supabaseAdmin } from "./supabase-admin";

export const CHAT_BUCKET = "solstone-team-chat";
export const CHAT_LANGS = ["de", "ba", "uz", "cz", "en"] as const;
export type ChatLanguage = (typeof CHAT_LANGS)[number];

export type ChatUser = {
  id: string;
  name: string;
  isAdmin: boolean;
};

// Reject cross-site state changes even when a signed cookie is present.
// The app's browser/API calls are same-origin on iPhone, Android and desktop.
export function isSameOriginChatMutation(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  return origin !== null && origin === request.nextUrl.origin;
}

export function chatError(message: string, status = 400) {
  return NextResponse.json({ error: message }, {
    status, headers: { "Cache-Control": "no-store" },
  });
}

export async function getChatUser(): Promise<ChatUser | null> {
  const store = await cookies();
  const token = store.get("solstone_session")?.value;
  const session = verifySessionToken(token);
  // Never grant confidential chat access on the old app cookie alone:
  // legacy logins still contain publicly documented PIN shortcuts.
  const chatToken = store.get("solstone_chat_auth")?.value;
  const chatSession = verifySessionToken(chatToken);
  if (!session || !chatSession || session.id !== chatSession.id ||
      !/^\d+$/.test(String(session.id))) return null;

  // Never trust roles, names or worker ids from localStorage, query strings,
  // request bodies or even a stale signed session alone.
  const { data, error } = await supabaseAdmin
    .from("workers")
    .select("id,name,role,active")
    .eq("id", session.id)
    .maybeSingle();

  if (error || !data || data.active === false || !data.name) return null;

  return {
    id: String(data.id),
    name: String(data.name),
    isAdmin: String(data.role || "").toLowerCase() === "admin",
  };
}

export function currentViennaDate() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Vienna", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const p = (name: string) => parts.find((part) => part.type === name)?.value ?? "";
  return p("year") + "-" + p("month") + "-" + p("day");
}

export async function authorizedSiteIds(user: ChatUser): Promise<string[]> {
  if (user.isAdmin) {
    const { data, error } = await supabaseAdmin
      .from("baustellen")
      .select("id")
      .eq("status", "Aktiv")
      .limit(500);
    if (error) throw error;
    return (data ?? []).map((site) => String(site.id));
  }

  // Site membership follows TODAY'S actual calendar. A previous job does not
  // allow a worker to read that site's future conversations.
  // Exact name match only: contains/substring matches could expose other sites.
  const { data, error } = await supabaseAdmin
    .from("work_calendar")
    .select("baustelle_id")
    .eq("datum", currentViennaDate())
    .eq("worker_name", user.name)
    .not("baustelle_id", "is", null)
    .limit(200);

  if (error) throw error;
  return Array.from(new Set((data ?? []).map((r) => String(r.baustelle_id))));
}

export type ChatRoom = {
  id: string;
  kind: "private" | "site" | "announcements";
  site_id: number | null;
  private_pair: string | null;
  created_by: number;
  created_at: string;
};

export async function getAuthorizedRoom(
  user: ChatUser,
  roomId: string,
): Promise<ChatRoom | null> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(roomId)) {
    return null;
  }
  const { data: room, error } = await supabaseAdmin
    .from("solstone_chat_rooms")
    .select("id,kind,site_id,private_pair,created_by,created_at")
    .eq("id", roomId)
    .maybeSingle();

  if (error || !room) return null;

  if (room.kind === "announcements") return room as ChatRoom;
  if (room.kind === "site") {
    const ids = await authorizedSiteIds(user);
    return ids.includes(String(room.site_id)) ? (room as ChatRoom) : null;
  }

  if (room.kind === "private") {
    const { data: member, error: memberError } = await supabaseAdmin
      .from("solstone_chat_members")
      .select("worker_id")
      .eq("room_id", room.id)
      .eq("worker_id", user.id)
      .maybeSingle();
    return !memberError && member ? (room as ChatRoom) : null;
  }

  return null;
}

export function canWriteChatRoom(user: ChatUser, room: ChatRoom) {
  return room.kind !== "announcements" || user.isAdmin;
}

export const CHAT_FILE_TYPES: Record<string, { kind: "image"|"pdf"|"voice"; ext: string }> = {
  "image/jpeg": { kind: "image", ext: "jpg" },
  "image/png": { kind: "image", ext: "png" },
  "image/webp": { kind: "image", ext: "webp" },
  "application/pdf": { kind: "pdf", ext: "pdf" },
  "audio/webm": { kind: "voice", ext: "webm" },
  "audio/mp4": { kind: "voice", ext: "m4a" },
  "audio/mpeg": { kind: "voice", ext: "mp3" },
  "audio/ogg": { kind: "voice", ext: "ogg" },
  "audio/wav": { kind: "voice", ext: "wav" },
  "audio/x-wav": { kind: "voice", ext: "wav" },
};

export const CHAT_MAX_FILE_BYTES = 20 * 1024 * 1024;

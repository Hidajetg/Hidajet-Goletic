import { isSameOriginChatMutation, NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../lib/supabase-admin";
import { authorizedSiteIds, chatError, getChatUser } from "../../lib/team-chat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RoomRow = {
  id: string; kind: "private"|"site"|"announcements";
  site_id: number | null; private_pair: string | null;
  created_by: number; created_at: string;
};
type RoomDisplay = {
  id: string; kind: RoomRow["kind"]; label: string; siteId?: string; peerId?: string;
  unread: number; lastMessageId: string | null;
  lastSender: string | null; lastAt: string | null;
};

async function createRoom(
  kind: RoomRow["kind"], userId: string, siteId?: string, pair?: string,
): Promise<RoomRow> {
  let query = supabaseAdmin.from("solstone_chat_rooms").select("*").eq("kind", kind);
  if (kind === "site") query = query.eq("site_id", siteId as string);
  else if (kind === "private") query = query.eq("private_pair", pair as string);
  const existing = await query.maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data) return existing.data as RoomRow;

  const { data, error } = await supabaseAdmin
    .from("solstone_chat_rooms")
    .insert({
      kind,
      site_id: kind === "site" ? Number(siteId) : null,
      private_pair: kind === "private" ? pair : null,
      created_by: Number(userId),
    })
    .select("*").single();
  if (!error && data) return data as RoomRow;
  if (error?.code === "23505") {
    const retry = await query.maybeSingle();
    if (retry.data) return retry.data as RoomRow;
  }
  throw error ?? new Error("Cannot create chat");
}

export async function GET() {
  const user = await getChatUser();
  if (!user) return chatError("Prijava je istekla.", 401);
  try {
    const siteIds = await authorizedSiteIds(user);
    const [
      { data: sites, error: sitesError },
      { data: members, error: memberError },
      { data: allRooms, error: roomsError },
      { data: workers, error: workersError },
    ] = await Promise.all([
      siteIds.length
        ? supabaseAdmin.from("baustellen").select("id,naziv").in("id",siteIds).limit(500)
        : Promise.resolve({ data: [], error: null }),
      supabaseAdmin.from("solstone_chat_members").select("room_id").eq("worker_id",user.id).limit(500),
      supabaseAdmin.from("solstone_chat_rooms").select("id,kind,site_id,private_pair,created_by,created_at").limit(500),
      supabaseAdmin.from("workers").select("id,name,role,active").eq("active",true).order("name").limit(500),
    ]);
    if (sitesError || memberError || roomsError || workersError) {
      throw sitesError || memberError || roomsError || workersError;
    }
    const ownPrivateIds = new Set((members ?? []).map((member) => String(member.room_id)));
    const ownSites = new Set(siteIds);
    const visible = ((allRooms ?? []) as RoomRow[]).filter((room) =>
      room.kind === "announcements" ||
      (room.kind === "site" && room.site_id !== null && ownSites.has(String(room.site_id))) ||
      (room.kind === "private" && ownPrivateIds.has(room.id)),
    );
    const siteName = new Map((sites ?? []).map((site) => [String(site.id),String(site.naziv)]));
    const workerName = new Map((workers ?? []).map((worker) => [String(worker.id),String(worker.name)]));
    const roomName = (room: RoomRow) => {
      if (room.kind === "announcements") return "📢 Firmenmitteilungen";
      if (room.kind === "site") return "🏗️ " + (siteName.get(String(room.site_id)) ?? "Baustelle");
      const ids = String(room.private_pair ?? "").split(":");
      const other = ids.find((id) => id !== user.id);
      return other ? (workerName.get(other) ?? "Mitarbeiter") : "Privat";
    };

    const rooms: RoomDisplay[] = await Promise.all(visible.map(async (room) => {
      const [{ data: last, error: lastError }, { data: read, error: readError }] = await Promise.all([
        supabaseAdmin.from("solstone_chat_messages")
          .select("id,sender_id,created_at")
          .eq("room_id",room.id).order("created_at",{ascending:false}).limit(1).maybeSingle(),
        supabaseAdmin.from("solstone_chat_reads")
          .select("last_read_at").eq("room_id",room.id).eq("worker_id",user.id).maybeSingle(),
      ]);
      if (lastError || readError) throw lastError || readError;
      const { count, error } = await supabaseAdmin.from("solstone_chat_messages")
        .select("id",{count:"exact",head:true}).eq("room_id",room.id)
        .neq("sender_id",user.id)
        .gt("created_at",read?.last_read_at ?? "1970-01-01T00:00:00.000Z");
      if (error) throw error;
      return {
        id: room.id, kind: room.kind, label: roomName(room),
        ...(room.kind === "site" ? {siteId: String(room.site_id)} : {}),
        ...(room.kind === "private" ? {peerId: String(room.private_pair ?? "").split(":").find((id)=>id!==user.id)} : {}),
        unread: Math.min(count ?? 0,999),
        lastMessageId: last?.id ?? null,
        lastSender: last ? (workerName.get(String(last.sender_id)) ?? "Mitarbeiter") : null,
        lastAt: last?.created_at ?? null,
      };
    }));

    // A site or firm chat has no row until the first message. The UI can
    // create it on demand; don't create new rooms on a read request.
    for (const id of siteIds) {
      if (!rooms.some((room) => room.kind === "site" && room.siteId === id)) {
        rooms.push({ id: "site:" + id, kind: "site", siteId: id,
          label: "🏗️ " + (siteName.get(id) ?? "Baustelle"),
          unread: 0, lastMessageId: null, lastSender: null, lastAt: null });
      }
    }
    if (!rooms.some((room) => room.kind === "announcements")) {
      rooms.push({ id: "announcements", kind: "announcements",
        label: "📢 Firmenmitteilungen", unread:0,lastMessageId:null,lastSender:null,lastAt:null });
    }
    rooms.sort((a,b) => (b.lastAt ?? "").localeCompare(a.lastAt ?? ""));
    return NextResponse.json({
      user, rooms, workers: (workers ?? []).map((worker) => ({
        id: String(worker.id), name: String(worker.name),
      })),
      unread: rooms.reduce((total,room) => total + room.unread,0),
    },{headers:{"Cache-Control":"no-store"}});
  } catch (error) {
    console.error("Team chat rooms list failed:",error);
    return chatError("Chat još nije spreman na testnoj bazi.",503);
  }
}

export async function POST(request: NextRequest) {
  if (!isSameOriginChatMutation(request)) return chatError("Neispravan zahtjev.", 403);
  const user = await getChatUser();
  if (!user) return chatError("Prijava je istekla.",401);
  try {
    const body = await request.json();
    const kind = String(body.kind ?? "");
    if (!["private","site","announcements"].includes(kind)) {
      return chatError("Nepoznata vrsta razgovora.");
    }

    let room: RoomRow;
    if (kind === "private") {
      const targetId = String(body.targetWorkerId ?? "");
      if (!/^\d+$/.test(targetId) || targetId === user.id) return chatError("Odaberi drugog radnika.");
      const {data:target,error} = await supabaseAdmin.from("workers")
        .select("id,active").eq("id",targetId).maybeSingle();
      if (error || !target || target.active === false) return chatError("Radnik nije aktivan.",403);
      const pair = [user.id,targetId].sort((a,b)=> Number(a)-Number(b)).join(":");
      room = await createRoom("private",user.id,undefined,pair);
      const {error:membersError} = await supabaseAdmin.from("solstone_chat_members")
        .upsert([ {room_id:room.id,worker_id:user.id},
                  {room_id:room.id,worker_id:targetId}], {onConflict:"room_id,worker_id"});
      if (membersError) throw membersError;
    } else if (kind === "site") {
      const siteId = String(body.siteId ?? "");
      if (!/^\d+$/.test(siteId) || !(await authorizedSiteIds(user)).includes(siteId)) {
        return chatError("Nemaš pristup ovom gradilištu.",403);
      }
      room = await createRoom("site",user.id,siteId);
    } else {
      // All active employees can read, only admin can announce.
      if (!user.isAdmin) return chatError("Samo admin može otvoriti obavještenja.",403);
      room = await createRoom("announcements",user.id);
    }
    return NextResponse.json({id:room.id,kind:room.kind},{headers:{"Cache-Control":"no-store"}});
  } catch (error) {
    console.error("Create team chat room failed:",error);
    return chatError("Razgovor nije mogao biti otvoren.",500);
  }
}

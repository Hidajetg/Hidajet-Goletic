import { supabaseAdmin } from "./supabase-admin";
import { authorizedSiteIds, type ChatRoom } from "./team-chat";
import { nativePushConfigured, notifyNativeWorkers } from "./native-push";

export async function notifyAuthorizedChatRoom(room:ChatRoom,senderId:string){
  if(!nativePushConfigured())return;
  try{
    const {data:workers,error}=await supabaseAdmin.from("workers").select("id,name,role,active").eq("active",true).limit(500);
    if(error)throw error;
    const candidates=(workers??[]).filter(w=>String(w.id)!==senderId);
    let ids:string[]=[];
    if(room.kind==="private"){
      const {data:members,error:memberError}=await supabaseAdmin.from("solstone_chat_members").select("worker_id").eq("room_id",room.id);
      if(memberError)throw memberError;
      const allowed=new Set((members??[]).map(m=>String(m.worker_id)));
      ids=candidates.filter(w=>allowed.has(String(w.id))).map(w=>String(w.id));
    }else if(room.kind==="site"){
      const checked=await Promise.all(candidates.map(async w=>{
        const sites=await authorizedSiteIds({id:String(w.id),name:String(w.name),isAdmin:String(w.role).toLowerCase()==="admin"});
        return sites.includes(String(room.site_id))?String(w.id):null;
      }));
      ids=checked.filter((id):id is string=>id!==null);
    }else if(room.kind==="announcements")ids=candidates.map(w=>String(w.id));
    await notifyNativeWorkers(ids,"chat");
  }catch{console.error("Solstone authorized native push failed");}
}

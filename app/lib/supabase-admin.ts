import { createClient } from "@supabase/supabase-js";

// Create the privileged client only when a server route actually uses it.
// This lets the isolated preview BUILD without production credentials;
// requests fail closed until a separate staging Supabase key is configured.
type AdminClient = ReturnType<typeof createClient>;
let cached: AdminClient | null = null;

function requireAdminClient(): AdminClient {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Solstone staging server Supabase credentials are not configured.");
  }
  cached = createClient(url,key,{
    auth:{persistSession:false,autoRefreshToken:false},
  });
  return cached;
}

export const supabaseAdmin: AdminClient = new Proxy({} as AdminClient,{
  get(_target,property) {
    const client=requireAdminClient();
    const member=Reflect.get(client,property,client);
    return typeof member==="function" ? member.bind(client) : member;
  },
});

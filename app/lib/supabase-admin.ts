import { createClient } from "@supabase/supabase-js";

// The server-only Supabase client is initialized lazily. Preview builds can
// compile without a staging secret, while actual requests still fail closed.
function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Solstone staging server Supabase credentials are not configured.");
  }
  return createClient(url,key,{
    auth:{persistSession:false,autoRefreshToken:false},
  });
}

// Infer the exact SupabaseClient generic from createClient's result. Using
// ReturnType<typeof createClient> here mistakenly turns untyped table rows
// into 'never' under some Supabase SDK versions.
type AdminClient = ReturnType<typeof createAdminClient>;
let cached: AdminClient | null = null;

function requireAdminClient(): AdminClient {
  if (!cached) cached=createAdminClient();
  return cached;
}

export const supabaseAdmin: AdminClient = new Proxy({} as AdminClient,{
  get(_target,property) {
    const client=requireAdminClient();
    const member=Reflect.get(client,property,client);
    return typeof member==="function" ? member.bind(client) : member;
  },
});

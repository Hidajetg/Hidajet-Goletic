import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://axpfymarrqjebpwosidr.supabase.co";

const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4cGZ5bWFycnFqZWJwd29zaWRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5Nzc2OTQsImV4cCI6MjA5NTU1MzY5NH0.5Ps4DlgfC21yW2VFUoEiPXvPdf7KIV2bhTGgk_L2pdA";

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);
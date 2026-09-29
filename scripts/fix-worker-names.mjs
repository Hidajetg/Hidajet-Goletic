import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("GRESKA: Nedostaje NEXT_PUBLIC_SUPABASE_URL ili NEXT_PUBLIC_SUPABASE_ANON_KEY u .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const fixes = [
  ["Arnes", "Arnes Abazi"],
  ["Ramiz", "Ramiz Suvankulov"],
  ["Abror", "Abror Amirov"],
  ["Shohruh", "Shohruhbek Suvankulov"],
  ["Shohruhbek", "Shohruhbek Suvankulov"],
  ["Harun", "Harun"]
];

for (const [oldName, newName] of fixes) {
  const { data, error } = await supabase
    .from("baustelle_hours")
    .update({ worker: newName })
    .eq("worker", oldName)
    .select();

  if (error) {
    console.error("GRESKA za " + oldName + ": " + error.message);
  } else {
    console.log(oldName + " -> " + newName + ": promijenjeno " + data.length + " redova");
  }
}

console.log("GOTOVO.");

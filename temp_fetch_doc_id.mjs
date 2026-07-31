// Temporary script to fetch a single evidence_documents ID using Supabase client directly
import { createClient } from "@supabase/supabase-js";

// Supabase credentials from .env.local (hard‑coded for this temporary script)
const SUPABASE_URL = "https://yldsmegrdxcuqlfpzhht.supabase.co";
const SERVICE_ROLE_KEY = "VmP_kilXDb4YZbbRf7C7VNaReB9Jr2B6M5r258yYh6A";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function main() {
  const { data, error } = await supabase
    .from("evidence_documents")
    .select("id")
    .limit(1)
    .single();
  if (error) {
    console.error("Error fetching document ID:", error);
    process.exit(1);
  }
  console.log(data.id);
}

main();

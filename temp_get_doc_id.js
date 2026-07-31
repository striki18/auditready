// Temporary script to fetch a single evidence_documents ID using the project's Supabase client
import { supabase } from './lib/supabase.js';

async function main() {
  const { data, error } = await supabase
    .from('evidence_documents')
    .select('id')
    .limit(1)
    .single();
  if (error) {
    console.error('Error fetching document ID:', error);
    process.exit(1);
  }
  console.log(data.id);
}

main();

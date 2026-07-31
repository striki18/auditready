import { createClient } from "@supabase/supabase-js";

/**
 * Supabase client with elevated privileges using the service role key.
 * This client is intended for server‑side operations such as accessing
 * Storage buckets or performing privileged database queries.
 */
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

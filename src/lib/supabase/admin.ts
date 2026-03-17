import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// Only use server-side — never expose to the client
export const createAdminClient = () =>
  createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

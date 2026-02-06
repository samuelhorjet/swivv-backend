import { createClient } from "@supabase/supabase-js";
import { env } from "./env.js";

export const supabase = createClient(env.supabaseUrl, env.supabaseKey, {
  auth: {
    persistSession: false, 
  },
});

console.log("✅ Supabase Client Initialized (Service Role Access).");
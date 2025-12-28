import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log("Supabase Config Check:", {
    urlPresent: !!supabaseUrl,
    keyPresent: !!supabaseAnonKey,
    urlLength: supabaseUrl ? supabaseUrl.length : 0
});

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

import { createClient } from "@supabase/supabase-js";

// ⚠️ Substitua pelos dados do SEU projeto Supabase
// Project Settings → API → Project URL / anon public key
const SUPABASE_URL = "https://zymqaotverbezxpuijsh.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_l3dPerXCpBTLfnMyLjZieQ__GKBPbNu";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

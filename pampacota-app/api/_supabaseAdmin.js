// Client Supabase com privilégios administrativos (service_role), usado
// exclusivamente pelas funções serverless. Esse client ignora RLS, então
// NUNCA deve ser exposto ao navegador — só existe em código que roda no servidor.

import { createClient } from "@supabase/supabase-js";

export function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configuradas.");
  }

  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

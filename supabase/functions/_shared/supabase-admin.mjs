import { createClient } from "npm:@supabase/supabase-js@2";
import { HttpError } from "./http.mjs";

let clienteAdmin = null;

function env(name, fallback = "") {
  try {
    return Deno.env.get(name) ?? fallback;
  } catch {
    return fallback;
  }
}

export function getAdminClient() {
  if (clienteAdmin) return clienteAdmin;
  const url = env("SUPABASE_URL");
  const serviceRole = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceRole) {
    throw new HttpError("Supabase não configurado na Edge Function.", 500);
  }
  clienteAdmin = createClient(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return clienteAdmin;
}

export async function requireAdmin(req) {
  const cabecalho = req.headers.get("Authorization") ?? "";
  const token = cabecalho.replace(/^Bearer\s+/i, "").trim();
  if (!token) throw new HttpError("Sessão administrativa ausente.", 401);

  const admin = getAdminClient();
  const { data: auth, error: authError } = await admin.auth.getUser(token);
  if (authError || !auth.user) throw new HttpError("Sessão inválida ou expirada.", 401);

  const { data: perfil, error: perfilError } = await admin
    .from("cardapio_exemplo_perfis")
    .select("papel")
    .eq("id", auth.user.id)
    .maybeSingle();
  if (perfilError) throw new HttpError("Não foi possível verificar o perfil administrativo.", 500);
  if (perfil?.papel !== "admin") throw new HttpError("Acesso restrito ao administrador.", 403);

  return { admin, user: auth.user };
}

export function getSupabaseUrl() {
  return env("SUPABASE_URL");
}

import { supabase, urlAbsoluta } from "@/integrations/supabase/client";

export type ResultadoAdmin = { userId: string | null; admin: boolean; erroConfiguracao?: boolean };

export async function verificarAcessoAdmin(): Promise<ResultadoAdmin> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { userId: null, admin: false };
  const { data: admin, error: rpcError } = await supabase.rpc("cardapio_exemplo_e_admin");
  if (rpcError) {
    const mensagem = rpcError.message ?? "";
    const erroConfiguracao =
      rpcError.code === "PGRST202" ||
      rpcError.code === "PGRST205" ||
      /could not find the (function|table)|schema cache/i.test(mensagem);
    return { userId: data.user.id, admin: false, erroConfiguracao };
  }
  return { userId: data.user.id, admin: Boolean(admin) };
}

export async function entrar(email: string, senha: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha });
  if (error) throw error;
  return data;
}

export async function sair() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function recuperarSenha(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: urlAbsoluta("/redefinir-senha"),
  });
  if (error) throw error;
}

export async function atualizarSenha(novaSenha: string) {
  const { error } = await supabase.auth.updateUser({ password: novaSenha });
  if (error) throw error;
}

export function mensagemErro(erro: unknown): string {
  if (erro instanceof Error) return erro.message;
  if (erro && typeof erro === "object" && "message" in erro) {
    const msg = (erro as { message?: unknown }).message;
    if (typeof msg === "string" && msg.trim()) return msg;
  }
  if (typeof erro === "string") return erro;
  return "Não foi possível concluir a operação.";
}

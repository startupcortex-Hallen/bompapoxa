import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { LogIn } from "lucide-react";
import { toast } from "sonner";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { entrar, mensagemErro, sair, verificarAcessoAdmin } from "@/lib/auth";
import { urlDoApp } from "@/integrations/supabase/client";
import { useTitulo } from "@/lib/page-title";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string; erro?: string } => {
    const resultado: { redirect?: string; erro?: string } = {};
    if (typeof search.redirect === "string") resultado.redirect = search.redirect;
    if (typeof search.erro === "string") resultado.erro = search.erro;
    return resultado;
  },
  component: LoginPage,
});

function LoginPage() {
  useTitulo("Entrar", "Acesso administrativo da BOM PA POXA.");
  const search = Route.useSearch();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(search.erro === "acesso" ? "Esta conta não tem acesso administrativo." : null);
  const [enviando, setEnviando] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErro(null);
    if (!email.trim() || !senha) {
      setErro("Informe e-mail e senha.");
      return;
    }
    setEnviando(true);
    try {
      await entrar(email, senha);
      const acesso = await verificarAcessoAdmin();
      if (!acesso.admin) {
        await sair();
        setErro("Esta conta não tem permissão de administrador. Fale com o responsável pelo estabelecimento.");
        return;
      }
      toast.success("Bem-vindo de volta!");
      const base = import.meta.env.BASE_URL.replace(/\/+$/, "");
      let destino = search.redirect && search.redirect.startsWith("/") && !search.redirect.startsWith("//")
        ? search.redirect
        : "/admin";
      if (base && (destino === base || destino.startsWith(`${base}/`))) destino = destino.slice(base.length) || "/admin";
      window.location.assign(urlDoApp(destino));
    } catch (erroLogin) {
      setErro(mensagemErro(erroLogin));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <AuthLayout titulo="Entrar" subtitulo="Use o e-mail e a senha cadastrados pelo responsável.">
      <form onSubmit={submit} className="space-y-4">
        <Input
          label="E-mail"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="voce@exemplo.com"
          required
        />
        <Input
          label="Senha"
          type="password"
          autoComplete="current-password"
          value={senha}
          onChange={(event) => setSenha(event.target.value)}
          placeholder="Sua senha"
          required
        />
        {erro ? <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{erro}</p> : null}
        <Button type="submit" className="w-full" size="lg" carregando={enviando}>
          <LogIn className="h-4 w-4" /> Entrar
        </Button>
        <div className="text-center">
          <Link to="/recuperar-senha" className="text-xs text-muted-foreground underline decoration-current/30 underline-offset-4 hover:decoration-current">
            Esqueci minha senha
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}

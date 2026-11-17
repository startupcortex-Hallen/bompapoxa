import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { KeyRound } from "lucide-react";
import { toast } from "sonner";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { supabase, urlDoApp } from "@/integrations/supabase/client";
import { atualizarSenha, mensagemErro, sair } from "@/lib/auth";
import { useTitulo } from "@/lib/page-title";

export const Route = createFileRoute("/redefinir-senha")({
  component: RedefinirPage,
});

function RedefinirPage() {
  useTitulo("Criar nova senha", "Defina uma nova senha para o acesso administrativo.");
  const [pronto, setPronto] = useState<boolean | null>(null);
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    let ativo = true;
    const { data } = supabase.auth.onAuthStateChange((evento, sessao) => {
      if (!ativo) return;
      if (evento === "PASSWORD_RECOVERY" || sessao) setPronto(true);
    });
    void supabase.auth.getSession().then(({ data: sessao }) => {
      if (ativo) setPronto(Boolean(sessao.session));
    });
    return () => {
      ativo = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErro(null);
    if (senha.length < 6) {
      setErro("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (senha !== confirmacao) {
      setErro("As senhas não conferem.");
      return;
    }
    setEnviando(true);
    try {
      await atualizarSenha(senha);
      toast.success("Senha atualizada. Entre novamente.");
      await sair();
      window.location.assign(urlDoApp("/login"));
    } catch (erroSenha) {
      setErro(mensagemErro(erroSenha));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <AuthLayout titulo="Criar nova senha" subtitulo="Escolha uma senha forte e fácil de lembrar.">
      {pronto === null ? (
        <p className="text-sm text-muted-foreground">Validando o link…</p>
      ) : !pronto ? (
        <div className="rounded-xl border border-danger/25 bg-danger/5 p-5 text-center">
          <KeyRound className="mx-auto h-8 w-8 text-danger" />
          <p className="mt-3 font-medium">Link inválido ou expirado</p>
          <p className="mt-1 text-sm text-muted-foreground">Solicite um novo link de recuperação.</p>
          <Link to="/recuperar-senha" className="mt-5 inline-flex">
            <Button variant="outline">Pedir novo link</Button>
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <Input label="Nova senha" type="password" autoComplete="new-password" value={senha} onChange={(event) => setSenha(event.target.value)} required />
          <Input label="Confirmar nova senha" type="password" autoComplete="new-password" value={confirmacao} onChange={(event) => setConfirmacao(event.target.value)} required />
          {erro ? <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{erro}</p> : null}
          <Button type="submit" className="w-full" size="lg" carregando={enviando}>
            Salvar nova senha
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}

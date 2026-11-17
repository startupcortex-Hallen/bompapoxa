import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, LogOut, Mail, Save, ShieldCheck, UserRound } from "lucide-react";
import { toast } from "sonner";
import { AdminPageHeader, AdminSection } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { EstadoErro, Skeleton } from "@/components/ui/feedback";
import { adminPerfilQuery, chaves } from "@/lib/queries";
import { atualizarNomePerfil } from "@/lib/api";
import { mensagemErro, recuperarSenha, sair } from "@/lib/auth";
import { supabase, urlDoApp } from "@/integrations/supabase/client";
import { useTitulo } from "@/lib/page-title";

export const Route = createFileRoute("/_authenticated/admin/conta")({
  component: ContaPage,
});

function ContaPage() {
  useTitulo("Minha conta");
  const qc = useQueryClient();
  const { data, isLoading, error, refetch } = useQuery(adminPerfilQuery);
  const [nome, setNome] = useState("");
  const [iniciado, setIniciado] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [alterandoSenha, setAlterandoSenha] = useState(false);
  const [erroSenha, setErroSenha] = useState<string | null>(null);

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-12 w-64" /><Skeleton className="h-56 rounded-2xl" /></div>;
  }

  if (error) {
    return (
      <EstadoErro
        mensagem={error instanceof Error ? error.message : "Não foi possível carregar os dados da conta."}
        aoTentarNovamente={() => void refetch()}
      />
    );
  }

  const valorNome = iniciado ? nome : data?.perfil?.nome ?? "";
  const email = data?.email ?? "";

  const salvar = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!valorNome.trim()) {
      toast.error("Informe seu nome.");
      return;
    }
    setSalvando(true);
    try {
      await atualizarNomePerfil(valorNome);
      await qc.invalidateQueries({ queryKey: chaves.adminPerfil });
      toast.success("Nome atualizado.");
    } catch (erro) {
      toast.error(mensagemErro(erro));
    } finally {
      setSalvando(false);
    }
  };

  const enviarRecuperacao = async () => {
    if (!email) return;
    try {
      await recuperarSenha(email);
      toast.success("Enviamos um link de redefinição para seu e-mail.");
    } catch (erro) {
      toast.error(mensagemErro(erro));
    }
  };

  const alterarSenha = async (event: React.FormEvent) => {
    event.preventDefault();
    setErroSenha(null);
    if (!email) {
      setErroSenha("Sessão sem e-mail. Entre novamente.");
      return;
    }
    if (novaSenha.length < 6) {
      setErroSenha("A nova senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (novaSenha !== confirmarSenha) {
      setErroSenha("As senhas não conferem.");
      return;
    }
    setAlterandoSenha(true);
    try {
      const { error: erroReautenticacao } = await supabase.auth.signInWithPassword({ email, password: senhaAtual });
      if (erroReautenticacao) throw new Error("Senha atual incorreta.");
      const { error: erroAtualizacao } = await supabase.auth.updateUser({ password: novaSenha });
      if (erroAtualizacao) throw erroAtualizacao;
      toast.success("Senha alterada com sucesso.");
      setSenhaAtual("");
      setNovaSenha("");
      setConfirmarSenha("");
    } catch (erro) {
      setErroSenha(mensagemErro(erro));
    } finally {
      setAlterandoSenha(false);
    }
  };

  const sairAgora = async () => {
    await qc.cancelQueries();
    qc.clear();
    try {
      await sair();
    } catch {
      // A navegação acontece mesmo se o servidor não responder.
    }
    window.location.assign(urlDoApp("/login"));
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader titulo="Minha conta" descricao="Dados do administrador e segurança do acesso." />
      <div className="grid gap-5 lg:grid-cols-2">
        <AdminSection titulo="Perfil" descricao="O nome aparece apenas no painel administrativo.">
          <form onSubmit={salvar} className="space-y-4">
            <Input label="Nome" value={valorNome} onChange={(event) => { setIniciado(true); setNome(event.target.value); }} />
            <Input label="E-mail" value={email} readOnly disabled />
            <div className="flex items-center gap-2 rounded-xl border border-border bg-secondary/30 px-3 py-2 text-sm">
              <ShieldCheck className="h-4 w-4 text-success" />
              Perfil: <strong>Administrador</strong>
            </div>
            <div className="flex justify-end">
              <Button type="submit" carregando={salvando}><Save className="h-4 w-4" /> Salvar nome</Button>
            </div>
          </form>
        </AdminSection>

        <AdminSection titulo="Segurança" descricao="Redefina a senha por e-mail ou saia deste dispositivo.">
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3 rounded-xl border border-border p-4">
              <Mail className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div className="flex-1">
                <p className="font-medium">E-mail de acesso</p>
                <p className="text-muted-foreground">{email || "—"}</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={() => void enviarRecuperacao()} disabled={!email}>
                  <KeyRound className="h-3.5 w-3.5" /> Enviar link de redefinição
                </Button>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl border border-border p-4">
              <UserRound className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div className="flex-1">
                <p className="font-medium">Sessão atual</p>
                <p className="text-muted-foreground">Encerre o acesso neste navegador.</p>
                <Button variant="outline" size="sm" className="mt-3 text-danger" onClick={() => void sairAgora()}>
                  <LogOut className="h-3.5 w-3.5" /> Sair da conta
                </Button>
              </div>
            </div>
          </div>
          <form onSubmit={alterarSenha} className="mt-5 space-y-3 rounded-xl border border-border p-4">
            <p className="flex items-center gap-2 font-medium"><KeyRound className="h-4 w-4" /> Alterar senha</p>
            <Input label="Senha atual" type="password" autoComplete="current-password" value={senhaAtual} onChange={(event) => setSenhaAtual(event.target.value)} />
            <Input label="Nova senha" type="password" autoComplete="new-password" value={novaSenha} onChange={(event) => setNovaSenha(event.target.value)} />
            <Input label="Confirmar nova senha" type="password" autoComplete="new-password" value={confirmarSenha} onChange={(event) => setConfirmarSenha(event.target.value)} />
            {erroSenha ? <p className="text-sm text-danger">{erroSenha}</p> : null}
            <Button type="submit" variant="outline" carregando={alterandoSenha}>Alterar senha</Button>
          </form>
        </AdminSection>
      </div>
    </div>
  );
}

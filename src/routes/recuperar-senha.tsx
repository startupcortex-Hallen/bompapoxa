import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { MailCheck } from "lucide-react";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { mensagemErro, recuperarSenha } from "@/lib/auth";
import { useTitulo } from "@/lib/page-title";

export const Route = createFileRoute("/recuperar-senha")({
  component: RecuperarPage,
});

function RecuperarPage() {
  useTitulo("Recuperar senha", "Recupere o acesso administrativo da BOM PA POXA.");
  const [email, setEmail] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErro(null);
    if (!email.trim()) {
      setErro("Informe o e-mail cadastrado.");
      return;
    }
    setEnviando(true);
    try {
      await recuperarSenha(email);
      setEnviado(true);
    } catch (erroRecuperacao) {
      setErro(mensagemErro(erroRecuperacao));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <AuthLayout titulo="Recuperar senha" subtitulo="Enviaremos um link seguro para você criar uma nova senha.">
      {enviado ? (
        <div className="rounded-xl border border-success/25 bg-success/5 p-5 text-center">
          <MailCheck className="mx-auto h-8 w-8 text-success" />
          <p className="mt-3 font-medium">Link enviado</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Confira a caixa de entrada de {email} e siga as instruções. Verifique também o spam.
          </p>
          <Link to="/login" className="mt-5 inline-flex">
            <Button variant="outline">Voltar ao login</Button>
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <Input
            label="E-mail cadastrado"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="voce@exemplo.com"
            required
          />
          {erro ? <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{erro}</p> : null}
          <Button type="submit" className="w-full" size="lg" carregando={enviando}>
            Enviar link de recuperação
          </Button>
          <div className="text-center">
            <Link to="/login" className="text-xs text-muted-foreground underline decoration-current/30 underline-offset-4 hover:decoration-current">
              Voltar ao login
            </Link>
          </div>
        </form>
      )}
    </AuthLayout>
  );
}

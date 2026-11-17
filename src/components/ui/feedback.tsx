import { AlertCircle, Inbox, LoaderCircle, RefreshCw } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

export function Spinner({ className }: { className?: string }) {
  return <LoaderCircle className={cn("h-5 w-5 animate-spin", className)} aria-label="Carregando" />;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-lg", className)} aria-hidden />;
}

export function EstadoVazio({
  titulo,
  descricao,
  acao,
  icone,
  className,
}: {
  titulo: string;
  descricao?: string;
  acao?: ReactNode;
  icone?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid place-items-center rounded-2xl border border-dashed border-border bg-card/60 px-6 py-14 text-center", className)}>
      <div className="max-w-md">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-secondary text-muted-foreground">
          {icone ?? <Inbox className="h-6 w-6" />}
        </div>
        <h3 className="mt-4 text-xl">{titulo}</h3>
        {descricao ? <p className="mt-2 text-sm text-muted-foreground">{descricao}</p> : null}
        {acao ? <div className="mt-5 flex justify-center">{acao}</div> : null}
      </div>
    </div>
  );
}

export function EstadoErro({
  mensagem,
  aoTentarNovamente,
}: {
  mensagem: string;
  aoTentarNovamente?: () => void;
}) {
  return (
    <div className="mx-auto max-w-xl rounded-2xl border border-danger/25 bg-danger/5 px-6 py-10 text-center">
      <AlertCircle className="mx-auto h-8 w-8 text-danger" />
      <h2 className="mt-3 text-2xl">Não foi possível carregar</h2>
      <p className="mt-2 text-sm text-muted-foreground">{mensagem}</p>
      {aoTentarNovamente ? (
        <Button variant="outline" className="mt-5" onClick={aoTentarNovamente}>
          <RefreshCw className="h-4 w-4" />
          Tentar novamente
        </Button>
      ) : null}
    </div>
  );
}

export function Badge({
  children,
  className,
  cor,
}: {
  children: ReactNode;
  className?: string;
  cor?: "primary" | "accent" | "success" | "danger" | "neutral";
}) {
  const cores = {
    primary: "bg-primary/10 text-primary border-primary/20",
    accent: "bg-accent/15 text-foreground border-accent/30",
    success: "bg-success/10 text-success border-success/20",
    danger: "bg-danger/10 text-danger border-danger/20",
    neutral: "bg-secondary text-muted-foreground border-border",
  };
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium", cores[cor ?? "neutral"], className)}>
      {children}
    </span>
  );
}

import { ImagePlus, LoaderCircle, Trash2, Upload } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { enviarImagem, type PastaImagem } from "@/lib/image-upload";
import { cn } from "@/lib/utils";

export function AdminPageHeader({
  titulo,
  descricao,
  acao,
}: {
  titulo: string;
  descricao?: string;
  acao?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="eyebrow">Gestão</p>
        <h1 className="mt-2 text-4xl leading-tight sm:text-5xl">{titulo}</h1>
        {descricao ? <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{descricao}</p> : null}
      </div>
      {acao ? <div className="flex flex-wrap items-center gap-2">{acao}</div> : null}
    </div>
  );
}

export function AdminSection({
  titulo,
  descricao,
  acao,
  children,
  className,
}: {
  titulo: string;
  descricao?: string;
  acao?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-2xl border border-border bg-card p-5 sm:p-6", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl">{titulo}</h2>
          {descricao ? <p className="mt-1 text-sm text-muted-foreground">{descricao}</p> : null}
        </div>
        {acao ? <div className="flex flex-wrap items-center gap-2">{acao}</div> : null}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function StatCard({
  rotulo,
  valor,
  detalhe,
  icone,
  destaque,
}: {
  rotulo: string;
  valor: string;
  detalhe?: string;
  icone?: ReactNode;
  destaque?: boolean;
}) {
  return (
    <div className={cn("rounded-2xl border border-border bg-card p-5", destaque && "border-primary/30 bg-primary/5")}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium text-muted-foreground">{rotulo}</p>
        {icone ? <span className="text-muted-foreground">{icone}</span> : null}
      </div>
      <p className={cn("mt-2 text-3xl font-semibold tabular-nums", destaque && "text-primary")}>{valor}</p>
      {detalhe ? <p className="mt-1 text-[11px] text-muted-foreground">{detalhe}</p> : null}
    </div>
  );
}

export function ImageUpload({
  valor,
  onChange,
  pasta,
  rotulo,
  descricao,
  aspecto = "aspect-[4/3]",
  className,
}: {
  valor: string | null;
  onChange: (url: string | null) => void;
  pasta: PastaImagem;
  rotulo: string;
  descricao?: string;
  aspecto?: string;
  className?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);

  const selecionar = async (arquivo: File | undefined) => {
    if (!arquivo) return;
    setEnviando(true);
    try {
      const url = await enviarImagem(arquivo, pasta);
      onChange(url);
      toast.success("Imagem enviada.");
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível enviar a imagem.");
    } finally {
      setEnviando(false);
      if (input.current) input.current.value = "";
    }
  };

  return (
    <div className={className}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">{rotulo}</p>
        {valor ? (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-danger"
          >
            <Trash2 className="h-3 w-3" /> Remover
          </button>
        ) : null}
      </div>
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={enviando}
        className={cn(
          "group relative mt-1.5 flex w-full items-center justify-center overflow-hidden rounded-xl border border-dashed border-border bg-secondary/30 transition hover:bg-secondary/55",
          aspecto,
        )}
      >
        {valor ? (
          <img src={valor} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="flex flex-col items-center gap-1.5 p-4 text-center text-xs text-muted-foreground">
            <ImagePlus className="h-5 w-5" />
            Enviar imagem
          </span>
        )}
        {enviando ? (
          <span className="absolute inset-0 grid place-items-center bg-black/45 text-white">
            <LoaderCircle className="h-6 w-6 animate-spin" />
          </span>
        ) : null}
        {valor && !enviando ? (
          <span className="absolute inset-x-0 bottom-0 bg-black/55 px-2 py-1.5 text-center text-[10px] text-white opacity-0 transition group-hover:opacity-100">
            <Upload className="mr-1 inline h-3 w-3" /> Trocar imagem
          </span>
        ) : null}
      </button>
      {descricao ? <p className="mt-1 text-[11px] text-muted-foreground">{descricao}</p> : null}
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        className="hidden"
        onChange={(event) => void selecionar(event.target.files?.[0])}
      />
    </div>
  );
}

export function BotaoExcluir({ aoConfirmar, rotulo }: { aoConfirmar: () => void; rotulo: string }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="text-danger hover:bg-danger/10"
      onClick={() => {
        if (window.confirm(`Excluir ${rotulo}? Esta ação não pode ser desfeita.`)) aoConfirmar();
      }}
    >
      <Trash2 className="h-4 w-4" /> Excluir
    </Button>
  );
}

export function AvisoAdmin({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-accent/35 bg-accent/10 px-4 py-3 text-sm">{children}</div>;
}

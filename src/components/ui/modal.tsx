import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

export function Modal({
  aberto,
  aoFechar,
  titulo,
  descricao,
  children,
  className,
  largura = "max-w-2xl",
}: {
  aberto: boolean;
  aoFechar: () => void;
  titulo: string;
  descricao?: string;
  children: ReactNode;
  className?: string;
  largura?: string;
}) {
  useEffect(() => {
    if (!aberto) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") aoFechar();
    };
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [aberto, aoFechar]);

  if (!aberto) return null;

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-6" onMouseDown={(event) => event.target === event.currentTarget && aoFechar()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-titulo"
        className={cn(
          "animar-subir max-h-[92vh] w-full overflow-y-auto rounded-t-2xl border border-border bg-card p-5 shadow-2xl sm:rounded-2xl sm:p-7",
          largura,
          className,
        )}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 id="modal-titulo" className="text-2xl leading-tight">
              {titulo}
            </h2>
            {descricao ? <p className="mt-1 text-sm text-muted-foreground">{descricao}</p> : null}
          </div>
          <button
            type="button"
            onClick={aoFechar}
            aria-label="Fechar"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-secondary hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function Drawer({
  aberto,
  aoFechar,
  titulo,
  children,
  largura = "sm:max-w-md",
}: {
  aberto: boolean;
  aoFechar: () => void;
  titulo: string;
  children: ReactNode;
  largura?: string;
}) {
  useEffect(() => {
    if (!aberto) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") aoFechar();
    };
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [aberto, aoFechar]);

  if (!aberto) return null;

  return createPortal(
    <div className="fixed inset-0 z-[80] flex justify-end bg-black/45 backdrop-blur-[2px]" onMouseDown={(event) => event.target === event.currentTarget && aoFechar()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className={cn(
          "flex h-full w-full flex-col border-l border-border bg-card shadow-2xl",
          "max-sm:mt-16 max-sm:rounded-t-2xl max-sm:border-l-0 max-sm:border-t",
          largura,
        )}
      >
        <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
          <h2 className="text-xl">{titulo}</h2>
          <button
            type="button"
            onClick={aoFechar}
            aria-label="Fechar"
            className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground transition hover:bg-secondary hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

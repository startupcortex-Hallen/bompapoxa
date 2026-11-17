import type { ReactNode } from "react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Link } from "@tanstack/react-router";

export function AuthLayout({ children, titulo, subtitulo }: { children: ReactNode; titulo: string; subtitulo?: string }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
        <div className="relative hidden overflow-hidden border-r border-border lg:flex lg:flex-col lg:justify-between lg:p-12">
          <div className="pattern-hero absolute inset-0 opacity-70" />
          <div className="relative">
            <Link to="/" aria-label="Voltar ao cardápio">
              <BrandLogo subtitulo="Cardápio digital" />
            </Link>
            <h1 className="mt-16 max-w-md text-6xl leading-[0.98]">
              A casa organizada,
              <br />
              a cozinha tranquila.
            </h1>
            <p className="mt-6 max-w-sm text-sm leading-relaxed text-muted-foreground">
              Atualize o cardápio, acompanhe pedidos e cuide da sua marca em um só lugar.
            </p>
          </div>
          <div className="relative text-xs text-muted-foreground">
            <p>BOM PA POXA • Acesso do estabelecimento</p>
          </div>
        </div>

        <div className="flex flex-col">
          <div className="flex items-center justify-between border-b border-border px-5 py-4 lg:hidden">
            <Link to="/">
              <BrandLogo compacto />
            </Link>
            <Link to="/" className="text-xs text-muted-foreground underline underline-offset-4">
              Ver cardápio
            </Link>
          </div>
          <div className="flex flex-1 items-center justify-center px-5 py-10 sm:px-8">
            <div className="w-full max-w-md">
              <p className="eyebrow">Área do estabelecimento</p>
              <h2 className="mt-2 text-4xl leading-tight">{titulo}</h2>
              {subtitulo ? <p className="mt-2 text-sm text-muted-foreground">{subtitulo}</p> : null}
              <div className="mt-8">{children}</div>
              <p className="mt-8 text-center text-[11px] leading-relaxed text-muted-foreground">
                Acesso restrito à equipe autorizada. Se você não é administrador, volte ao{" "}
                <Link to="/" className="underline underline-offset-4">
                  cardápio
                </Link>
                .
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

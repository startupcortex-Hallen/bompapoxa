import { Clock, Instagram, MapPin, MessageCircle, ShieldCheck } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Badge } from "@/components/ui/feedback";
import { linkInstagram, urlExterna } from "@/lib/contact";
import { DIAS, faixaHorario, horariosDoDia, resumoFuncionamento, rotuloAbertura } from "@/lib/hours";
import { estiloTema } from "@/lib/theme";
import type { Configuracoes, Horario } from "@/lib/types";
import { cn } from "@/lib/utils";

function linkWhatsApp(numero: string | null): string | null {
  if (!numero) return null;
  const digitos = numero.replace(/\D/g, "");
  return digitos.length >= 10 ? `https://wa.me/${digitos}` : null;
}

function StatusLoja({ config, horarios, aberto }: { config: Configuracoes; horarios: Horario[]; aberto: boolean }) {
  const ativo = aberto && config.aceitando_pedidos;
  return (
    <Badge cor={ativo ? "success" : "neutral"} className="whitespace-nowrap">
      <span className={cn("h-1.5 w-1.5 rounded-full", ativo ? "bg-success" : "bg-muted-foreground")} />
      {rotuloAbertura(config, horarios, aberto)}
    </Badge>
  );
}

export function PublicLayout({
  config,
  horarios,
  aberto,
  children,
  className,
}: {
  config: Configuracoes;
  horarios: Horario[];
  aberto: boolean;
  children: ReactNode;
  className?: string;
}) {
  const whatsapp = linkWhatsApp(config.whatsapp ?? config.telefone);
  const instagram = linkInstagram(config.instagram_url);
  const mapa = urlExterna(config.mapa_url);

  useEffect(() => {
    const raiz = document.documentElement;
    const variaveis = estiloTema(config) as Record<string, string>;
    const anteriores = Object.keys(variaveis).map((chave) => [chave, raiz.style.getPropertyValue(chave)] as const);
    for (const [chave, valor] of Object.entries(variaveis)) raiz.style.setProperty(chave, valor);
    return () => {
      for (const [chave, valor] of anteriores) {
        if (valor) raiz.style.setProperty(chave, valor);
        else raiz.style.removeProperty(chave);
      }
    };
  }, [config]);

  return (
    <div style={estiloTema(config)} className={cn("min-h-screen bg-background text-foreground", className)}>
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link to="/" className="min-w-0" aria-label="Ir para o início">
            <BrandLogo nome={config.nome_estabelecimento} logoUrl={config.logo_url} compacto />
          </Link>
          <div className="flex items-center gap-2 sm:gap-4">
            <nav className="hidden items-center gap-5 text-sm md:flex">
              <Link to="/" hash="cardapio" className="text-muted-foreground transition hover:text-foreground">
                Cardápio
              </Link>
              <Link to="/" hash="avaliacoes" className="text-muted-foreground transition hover:text-foreground">
                Avaliações
              </Link>
              <Link to="/" hash="contato" className="text-muted-foreground transition hover:text-foreground">
                Contato
              </Link>
            </nav>
            <StatusLoja config={config} horarios={horarios} aberto={aberto} />
            <Link
              to="/login"
              aria-label="Acesso administrativo"
              className="grid h-9 w-9 place-items-center rounded-full border border-border text-muted-foreground transition hover:bg-secondary hover:text-foreground"
            >
              <ShieldCheck className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      <main>{children}</main>

      <footer id="contato" className="mt-16 border-t border-border bg-secondary/35">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-3">
          <div>
            <BrandLogo nome={config.nome_estabelecimento} logoUrl={config.logo_url} subtitulo="Cardápio digital" />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              {config.descricao || "Comida boa, feita com carinho."}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {instagram ? (
                <a
                  href={instagram}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-xs transition hover:bg-secondary"
                >
                  <Instagram className="h-4 w-4" /> Instagram
                </a>
              ) : null}
              {whatsapp ? (
                <a
                  href={whatsapp}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-xs transition hover:bg-secondary"
                >
                  <MessageCircle className="h-4 w-4" /> WhatsApp
                </a>
              ) : null}
            </div>
          </div>

          <div>
            <h3 className="flex items-center gap-2 text-lg">
              <Clock className="h-4 w-4" /> Funcionamento
            </h3>
            <p className="mt-3 text-sm text-muted-foreground">{resumoFuncionamento(horarios)}</p>
            <ul className="mt-3 space-y-1 text-sm">
              {DIAS.map((dia) => {
                const lista = horariosDoDia(horarios, dia.valor);
                return (
                  <li key={dia.valor} className="flex justify-between gap-4">
                    <span className="text-muted-foreground">{dia.curto}</span>
                    <span className="text-right">
                      {lista.length ? lista.map(faixaHorario).join(" • ") : "Fechado"}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          <div>
            <h3 className="flex items-center gap-2 text-lg">
              <MapPin className="h-4 w-4" /> Onde estamos
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {[config.endereco, config.bairro, config.cidade, config.estado].filter(Boolean).join(", ") || "Endereço em breve."}
            </p>
            {config.telefone ? <p className="mt-3 text-sm">{config.telefone}</p> : null}
            {config.email ? <p className="text-sm text-muted-foreground">{config.email}</p> : null}
            {mapa ? (
              <a
                href={mapa}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex text-sm underline decoration-current/30 underline-offset-4 hover:decoration-current"
              >
                Ver no mapa
              </a>
            ) : null}
            <div className="mt-6 flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span>{config.aceita_delivery ? `Entrega em até ${config.tempo_entrega_min} min` : ""}</span>
              {config.aceita_retirada ? <span>Retirada em até {config.tempo_retirada_min} min</span> : null}
            </div>
          </div>
        </div>
        <div className="border-t border-border/70">
          <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p>{config.rodape || `${config.nome_estabelecimento} • Cardápio digital`}</p>
            <Link to="/login" className="underline decoration-current/30 underline-offset-4 hover:decoration-current">
              Área do estabelecimento
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

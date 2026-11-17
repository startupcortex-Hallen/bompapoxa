import { Clock, Instagram, MapPin, MessageCircle, ShieldCheck } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
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

function StatusLoja({
  config,
  horarios,
  aberto,
  className,
}: {
  config: Configuracoes;
  horarios: Horario[];
  aberto: boolean;
  className?: string;
}) {
  const ativo = aberto && config.aceitando_pedidos;
  return (
    <Badge cor={ativo ? "success" : "neutral"} className={cn("whitespace-nowrap", className)}>
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
  headerOverlay = false,
}: {
  config: Configuracoes;
  horarios: Horario[];
  aberto: boolean;
  children: ReactNode;
  className?: string;
  headerOverlay?: boolean;
}) {
  const whatsapp = linkWhatsApp(config.whatsapp ?? config.telefone);
  const instagram = linkInstagram(config.instagram_url);
  const mapa = urlExterna(config.mapa_url);
  const [rolou, setRolou] = useState(false);

  useEffect(() => {
    const raiz = document.documentElement;
    const variaveis = estiloTema(config) as Record<string, string>;
    const anteriores = Object.keys(variaveis).map((chave) => [chave, raiz.style.getPropertyValue(chave)] as const);
    const esquemaAnterior = raiz.style.colorScheme;
    raiz.style.colorScheme = "dark";
    for (const [chave, valor] of Object.entries(variaveis)) raiz.style.setProperty(chave, valor);
    return () => {
      raiz.style.colorScheme = esquemaAnterior;
      for (const [chave, valor] of anteriores) {
        if (valor) raiz.style.setProperty(chave, valor);
        else raiz.style.removeProperty(chave);
      }
    };
  }, [config]);

  useEffect(() => {
    if (!headerOverlay) return;
    const aoRolar = () => setRolou(window.scrollY > 28);
    aoRolar();
    window.addEventListener("scroll", aoRolar, { passive: true });
    return () => window.removeEventListener("scroll", aoRolar);
  }, [headerOverlay]);

  const noTopo = headerOverlay && !rolou;

  return (
    <div style={estiloTema(config)} className={cn("theme-cinema min-h-screen bg-background text-foreground", className)}>
      <header
        className={cn(
          "z-40 transition-all duration-300",
          headerOverlay ? "fixed inset-x-0 top-0" : "sticky top-0",
          noTopo
            ? "border-b border-transparent bg-transparent"
            : "border-b border-white/10 bg-[#090909]/90 shadow-[0_18px_60px_-30px_rgba(0,0,0,0.95)] backdrop-blur-xl",
        )}
      >
        <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between gap-3 px-4 sm:px-6">
          <Link to="/" className="min-w-0" aria-label="Ir para o início">
            <BrandLogo nome={config.nome_estabelecimento} logoUrl={config.logo_url} compacto />
          </Link>
          <div className="flex items-center gap-2 sm:gap-4">
            <nav className="hidden items-center gap-5 text-xs font-medium uppercase tracking-[0.16em] md:flex">
              <Link
                to="/"
                hash="cardapio"
                className={cn("transition", noTopo ? "text-white/65 hover:text-white" : "text-muted-foreground hover:text-foreground")}
              >
                Cardápio
              </Link>
              <Link
                to="/"
                hash="avaliacoes"
                className={cn("transition", noTopo ? "text-white/65 hover:text-white" : "text-muted-foreground hover:text-foreground")}
              >
                Avaliações
              </Link>
              <Link
                to="/"
                hash="contato"
                className={cn("transition", noTopo ? "text-white/65 hover:text-white" : "text-muted-foreground hover:text-foreground")}
              >
                Contato
              </Link>
            </nav>
            <StatusLoja
              config={config}
              horarios={horarios}
              aberto={aberto}
              className={cn(noTopo && "border-white/20 bg-black/30 text-white backdrop-blur-md")}
            />
            <Link
              to="/login"
              aria-label="Acesso administrativo"
              className={cn(
                "grid h-9 w-9 place-items-center rounded-full border transition",
                noTopo
                  ? "border-white/20 text-white/70 hover:bg-white/10 hover:text-white"
                  : "border-border text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              <ShieldCheck className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      <main className={cn(headerOverlay && "pt-0")}>{children}</main>

      <footer id="contato" className="mt-20 border-t border-white/10 bg-[#070707]">
        <div className="mx-auto grid max-w-[1400px] gap-10 px-4 py-14 sm:px-6 md:grid-cols-3">
          <div>
            <BrandLogo nome={config.nome_estabelecimento} logoUrl={config.logo_url} subtitulo="Hamburgueria artesanal" />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/55">
              {config.descricao || "Smash burgers, ingredientes frescos e muito sabor."}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {instagram ? (
                <a
                  href={instagram}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white/65 transition hover:border-gold/40 hover:text-gold"
                >
                  <Instagram className="h-4 w-4" /> Instagram
                </a>
              ) : null}
              {whatsapp ? (
                <a
                  href={whatsapp}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white/65 transition hover:border-gold/40 hover:text-gold"
                >
                  <MessageCircle className="h-4 w-4" /> WhatsApp
                </a>
              ) : null}
            </div>
          </div>

          <div>
            <h3 className="flex items-center gap-2 text-xl uppercase text-white">
              <Clock className="h-4 w-4 text-gold" /> Funcionamento
            </h3>
            <p className="mt-3 text-sm text-white/55">{resumoFuncionamento(horarios)}</p>
            <ul className="mt-4 space-y-1.5 text-sm">
              {DIAS.map((dia) => {
                const lista = horariosDoDia(horarios, dia.valor);
                return (
                  <li key={dia.valor} className="flex justify-between gap-4">
                    <span className="text-white/45">{dia.curto}</span>
                    <span className="text-right text-white/80">
                      {lista.length ? lista.map(faixaHorario).join(" • ") : "Fechado"}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          <div>
            <h3 className="flex items-center gap-2 text-xl uppercase text-white">
              <MapPin className="h-4 w-4 text-gold" /> Onde estamos
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-white/55">
              {[config.endereco, config.bairro, config.cidade, config.estado].filter(Boolean).join(", ") || "Endereço em breve."}
            </p>
            {config.telefone ? <p className="mt-3 text-sm text-white/80">{config.telefone}</p> : null}
            {config.email ? <p className="text-sm text-white/55">{config.email}</p> : null}
            {mapa ? (
              <a
                href={mapa}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex text-sm text-gold underline decoration-gold/30 underline-offset-4 hover:decoration-gold"
              >
                Ver no mapa
              </a>
            ) : null}
            <div className="mt-6 flex flex-wrap gap-3 text-xs uppercase tracking-[0.12em] text-white/40">
              <span>{config.aceita_delivery ? `Entrega em até ${config.tempo_entrega_min} min` : ""}</span>
              {config.aceita_retirada ? <span>Retirada em até ${config.tempo_retirada_min} min</span> : null}
            </div>
          </div>
        </div>
        <div className="border-t border-white/10">
          <div className="mx-auto flex max-w-[1400px] flex-col gap-2 px-4 py-5 text-xs text-white/35 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p>{config.rodape || `${config.nome_estabelecimento} • Cardápio digital`}</p>
            <Link to="/login" className="underline decoration-current/30 underline-offset-4 hover:text-white/70 hover:decoration-current">
              Área do estabelecimento
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

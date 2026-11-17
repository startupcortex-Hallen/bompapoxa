import { useDeferredValue, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowRight,
  Bike,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  Flame,
  RefreshCw,
  Search,
  ShoppingBag,
  Star,
  Store,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { EstadoErro, EstadoVazio, Skeleton } from "@/components/ui/feedback";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { useCarrinho } from "@/hooks/use-cart";
import { cardapioQuery } from "@/lib/queries";
import { urlExterna } from "@/lib/contact";
import { dataBR, moedaBRL } from "@/lib/format";
import { resumoFuncionamento } from "@/lib/hours";
import { FORMA_PAGAMENTO_LABEL } from "@/lib/order-status";
import { useTitulo } from "@/lib/page-title";
import type { CardapioPublico, Categoria, Combo, Produto } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CartDrawer } from "./CartDrawer";
import { ComboModal } from "./ComboModal";
import { Estrelas, precoVigente } from "./common";
import { ProdutoCard } from "./ProductCard";
import { ProdutoModal } from "./ProductModal";
import { ComboCard } from "./ComboCard";
import { PublicLayout } from "@/components/layout/PublicLayout";

const BASE = import.meta.env.BASE_URL;
const HERO_VIDEO_DESKTOP = `${BASE}videos/hero-cinema-720.mp4`;
const HERO_VIDEO_MOBILE = `${BASE}videos/hero-cinema-360.mp4`;
const HERO_POSTER = `${BASE}videos/hero-poster.jpg`;

export function MenuPage() {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery(cardapioQuery);
  useTitulo(data?.configuracoes.nome_estabelecimento, data?.configuracoes.descricao ?? undefined);

  if (isLoading) return <CarregandoCardapio />;
  if (isError || !data) {
    return (
      <ErroCardapio
        mensagem={error instanceof Error ? error.message : "Não foi possível abrir o cardápio."}
        tentarNovamente={() => void refetch()}
      />
    );
  }
  return <Conteudo data={data} atualizar={() => void refetch()} atualizando={isFetching} />;
}

function Conteudo({ data, atualizar, atualizando }: { data: CardapioPublico; atualizar: () => void; atualizando: boolean }) {
  const { configuracoes: config, categorias, produtos, combos, banners, horarios, avaliacoes, aberto } = data;
  const carrinho = useCarrinho();
  const [produto, setProduto] = useState<Produto | null>(null);
  const [combo, setCombo] = useState<Combo | null>(null);
  const [sacolaAberta, setSacolaAberta] = useState(false);
  const [busca, setBusca] = useState("");
  const buscaAdiada = useDeferredValue(busca);
  const [ativo, setAtivo] = useState("destaques");
  const [pulsoCarrinho, setPulsoCarrinho] = useState(false);
  const quantidadeAnterior = useRef(carrinho.quantidade);

  const bloqueado = !config.aceitando_pedidos;
  const categoriasVisiveis = useMemo(
    () => categorias.filter((categoria) => produtos.some((p) => p.categoria_id === categoria.id)),
    [categorias, produtos],
  );
  const destaques = useMemo(() => produtos.filter((p) => p.destaque && p.disponivel).slice(0, 8), [produtos]);
  const imagemCasa = useMemo(
    () => produtos.find((p) => p.nome.toLowerCase().includes("bacon"))?.imagem_url ?? produtos[0]?.imagem_url ?? banners[0]?.imagem_url,
    [produtos, banners],
  );

  const termo = buscaAdiada.trim().toLowerCase();
  const resultados = useMemo(() => {
    if (!termo) return [];
    return produtos.filter((p) => {
      const alvo = [p.nome, p.descricao ?? "", ...p.ingredientes].join(" ").toLowerCase();
      return alvo.includes(termo);
    });
  }, [produtos, termo]);
  const resultadosCombos = useMemo(() => {
    if (!termo) return [];
    return combos.filter((c) => [c.nome, c.descricao ?? ""].join(" ").toLowerCase().includes(termo));
  }, [combos, termo]);
  const heroTemImagem = Boolean(config.banner_url ?? banners[0]?.imagem_url);
  const bannersNaSecao = useMemo(() => (heroTemImagem ? banners.slice(1) : banners), [banners, heroTemImagem]);

  useEffect(() => {
    if (termo) return;
    const secoes = Array.from(document.querySelectorAll<HTMLElement>("[data-secao]"));
    if (!secoes.length) return;
    const observer = new IntersectionObserver(
      (entradas) => {
        const visivel = entradas.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visivel?.target.id) setAtivo(visivel.target.id);
      },
      { rootMargin: "-28% 0px -58% 0px", threshold: [0.1, 0.4] },
    );
    secoes.forEach((secao) => observer.observe(secao));
    return () => observer.disconnect();
  }, [termo, categoriasVisiveis.length, destaques.length, combos.length, bannersNaSecao.length]);

  useEffect(() => {
    if (carrinho.quantidade > quantidadeAnterior.current) {
      setPulsoCarrinho(true);
      const timer = window.setTimeout(() => setPulsoCarrinho(false), 520);
      quantidadeAnterior.current = carrinho.quantidade;
      return () => window.clearTimeout(timer);
    }
    quantidadeAnterior.current = carrinho.quantidade;
  }, [carrinho.quantidade]);

  const irPara = (id: string) => {
    setBusca("");
    setAtivo(id);
    window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }), 30);
  };

  const vazio = produtos.length === 0 && combos.length === 0;
  const media = avaliacoes.length ? avaliacoes.reduce((soma, a) => soma + a.nota, 0) / avaliacoes.length : 0;

  const adicionarRapido = (item: Produto) => {
    if (bloqueado || !item.disponivel) return;
    const exigeEscolha = item.adicionais.some((a) => a.obrigatorio || a.min_qtd > 0);
    if (exigeEscolha) {
      setProduto(item);
      return;
    }
    carrinho.adicionar({
      produtoId: item.id,
      nome: item.nome,
      precoBase: precoVigente(item),
      adicionais: [],
      quantidade: 1,
      observacao: "",
      imagemUrl: item.imagem_url,
    });
    toast.success(`${item.nome} adicionado à sacola.`);
  };

  const adicionarComboRapido = (item: Combo) => {
    if (bloqueado || !item.disponivel) return;
    if (item.grupos.length) {
      setCombo(item);
      return;
    }
    carrinho.adicionar({
      comboId: item.id,
      nome: item.nome,
      precoBase: item.preco,
      adicionais: [],
      quantidade: 1,
      observacao: "",
      imagemUrl: item.imagem_url,
    });
    toast.success(`${item.nome} adicionado à sacola.`);
  };

  return (
    <PublicLayout config={config} horarios={horarios} aberto={aberto} headerOverlay>
      <div className={cn(carrinho.quantidade > 0 && "pb-28")}>
        <Hero config={config} banner={banners[0]} horarios={horarios} />

        {vazio ? (
          <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
            <EstadoVazio
              titulo="Cardápio em preparação"
              descricao="Estamos organizando as delícias da casa. Volte em breve para conferir."
              icone={<ShoppingBag className="h-6 w-6" />}
              acao={
                <Link to="/login">
                  <Button variant="outline">Área do estabelecimento</Button>
                </Link>
              }
            />
          </div>
        ) : (
          <>
            <nav
              id="cardapio"
              aria-label="Categorias do cardápio"
              className="sticky top-16 z-30 scroll-mt-24 border-y border-white/10 bg-[#090909]/90 backdrop-blur-xl"
            >
              <div className="mx-auto max-w-[1400px] px-4 py-3 sm:px-6">
                <div className="flex items-center gap-2">
                  <div className="relative min-w-0 flex-1">
                    <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                    <input
                      value={busca}
                      onChange={(event) => setBusca(event.target.value)}
                      placeholder="Qual vai ser seu próximo lanche?"
                      aria-label="Buscar no cardápio"
                      className="h-11 w-full rounded-full border border-white/10 bg-white/[0.04] pl-10 pr-10 text-sm text-white placeholder:text-white/35 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    {busca ? (
                      <button
                        type="button"
                        onClick={() => setBusca("")}
                        aria-label="Limpar busca"
                        className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-white/45 transition hover:bg-white/10 hover:text-white"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={atualizar}
                    aria-label="Atualizar cardápio"
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-white/55 transition hover:border-gold/40 hover:text-gold"
                  >
                    <RefreshCw className={cn("h-4 w-4", atualizando && "animate-spin")} />
                  </button>
                </div>

                {!termo ? (
                  <div className="hide-scrollbar -mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-0.5">
                    {destaques.length ? (
                      <Chip ativo={ativo === "destaques"} onClick={() => irPara("destaques")}>
                        Em alta
                      </Chip>
                    ) : null}
                    {combos.length ? (
                      <Chip ativo={ativo === "combos"} onClick={() => irPara("combos")}>
                        Combos
                      </Chip>
                    ) : null}
                    {bannersNaSecao.length ? (
                      <Chip ativo={ativo === "novidades"} onClick={() => irPara("novidades")}>
                        Novidades
                      </Chip>
                    ) : null}
                    {categoriasVisiveis.map((categoria) => (
                      <Chip key={categoria.id} ativo={ativo === `cat-${categoria.id}`} onClick={() => irPara(`cat-${categoria.id}`)}>
                        {categoria.nome}
                      </Chip>
                    ))}
                  </div>
                ) : null}
              </div>
            </nav>

            {!aberto || !config.aceitando_pedidos ? (
              <div className="mx-auto max-w-[1400px] px-4 pt-5 sm:px-6">
                <div className="rounded-2xl border border-gold/25 bg-gold/[0.06] px-4 py-3 text-sm text-white/75">
                  {config.aceitando_pedidos
                    ? "Estamos fechados agora. Você pode ver o cardápio e voltar quando abrirmos."
                    : "Os pedidos estão pausados neste momento. Volte em breve."}
                </div>
              </div>
            ) : null}

            {termo ? (
              <section id="resultados" className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6">
                <Reveal>
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <p className="eyebrow">Busca</p>
                      <h2 className="mt-2 font-display text-5xl uppercase leading-none text-white sm:text-6xl">
                        Resultados para “{buscaAdiada.trim()}”
                      </h2>
                    </div>
                    <span className="text-xs uppercase tracking-[0.14em] text-white/40">
                      {resultados.length + resultadosCombos.length} item(ns)
                    </span>
                  </div>
                </Reveal>
                {resultados.length ? (
                  <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {resultados.map((item, indice) => (
                      <Reveal key={item.id} delay={indice * 50} className="h-full">
                        <ProdutoCard produto={item} aoAbrir={setProduto} aoAdicionar={adicionarRapido} />
                      </Reveal>
                    ))}
                  </div>
                ) : null}
                {resultadosCombos.length ? (
                  <div className="mt-10">
                    <p className="eyebrow">Combos</p>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {resultadosCombos.map((item, indice) => (
                        <Reveal key={item.id} delay={indice * 50} className="h-full">
                          <ComboCard combo={item} aoAbrir={setCombo} aoAdicionar={adicionarComboRapido} />
                        </Reveal>
                      ))}
                    </div>
                  </div>
                ) : null}
                {!resultados.length && !resultadosCombos.length ? (
                  <EstadoVazio
                    className="mt-7"
                    titulo="Nenhum lanche encontrado"
                    descricao="Tente outro nome, ingrediente ou categoria."
                    acao={
                      <Button variant="outline" onClick={() => setBusca("")}>
                        Limpar busca
                      </Button>
                    }
                  />
                ) : null}
              </section>
            ) : (
              <>
                {bannersNaSecao.length ? (
                  <CollectionRow id="novidades" eyebrow="Novidades" title="Da casa" description="Promoções e novidades para matar a fome.">
                    {bannersNaSecao.map((banner, indice) => {
                      const link = urlExterna(banner.link_url);
                      const conteudo = (
                        <>
                          <div className="relative aspect-[16/9] overflow-hidden rounded-[1.2rem] bg-[#141414]">
                            {banner.imagem_url ? (
                              <img src={banner.imagem_url} alt={banner.titulo} loading="lazy" className="h-full w-full object-cover" />
                            ) : (
                              <div className="pattern-hero grid h-full place-items-center p-4 text-center">
                                <span className="font-display text-2xl uppercase text-white">{banner.titulo}</span>
                              </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
                          </div>
                          <p className="mt-3 line-clamp-2 font-display text-xl uppercase text-white">{banner.titulo}</p>
                          {banner.subtitulo ? <p className="mt-1 line-clamp-2 text-xs text-white/45">{banner.subtitulo}</p> : null}
                        </>
                      );
                      return (
                        <Reveal
                          key={banner.id}
                          delay={indice * 60}
                          className="w-[84vw] max-w-[380px] shrink-0 snap-start sm:w-[360px]"
                        >
                          {link ? (
                            <a
                              href={link}
                              target="_blank"
                              rel="noreferrer"
                              className="block rounded-[1.4rem] border border-white/10 bg-[#141414] p-2.5 transition hover:border-gold/40"
                            >
                              {conteudo}
                            </a>
                          ) : (
                            <div className="rounded-[1.4rem] border border-white/10 bg-[#141414] p-2.5">{conteudo}</div>
                          )}
                        </Reveal>
                      );
                    })}
                  </CollectionRow>
                ) : null}

                {destaques.length ? (
                  <CollectionRow id="destaques" eyebrow="Escolhas da casa" title="Em alta" description="Os favoritos de quem já provou.">
                    {destaques.map((item, indice) => (
                      <Reveal
                        key={item.id}
                        delay={indice * 60}
                        className="w-[82vw] max-w-[330px] shrink-0 snap-start sm:w-[300px] lg:w-[340px]"
                      >
                        <ProdutoCard produto={item} aoAbrir={setProduto} aoAdicionar={adicionarRapido} />
                      </Reveal>
                    ))}
                  </CollectionRow>
                ) : null}

                {combos.length ? (
                  <CollectionRow id="combos" eyebrow="Para dividir" title="Combos" description="Mais sabor, melhor preço.">
                    {combos.map((item, indice) => (
                      <Reveal
                        key={item.id}
                        delay={indice * 60}
                        className="w-[84vw] max-w-[360px] shrink-0 snap-start sm:w-[340px] lg:w-[380px]"
                      >
                        <ComboCard combo={item} aoAbrir={setCombo} aoAdicionar={adicionarComboRapido} />
                      </Reveal>
                    ))}
                  </CollectionRow>
                ) : null}

                {categoriasVisiveis.map((categoria) => (
                  <SecaoCategoria
                    key={categoria.id}
                    categoria={categoria}
                    produtos={produtos.filter((p) => p.categoria_id === categoria.id)}
                    aoAbrir={setProduto}
                    aoAdicionar={adicionarRapido}
                  />
                ))}

                <AboutSection config={config} horarios={horarios} imagem={imagemCasa ?? null} />

                <ReviewsSection avaliacoes={avaliacoes} media={media} />
              </>
            )}
          </>
        )}
      </div>

      {carrinho.quantidade > 0 ? (
        <div className="safe-bottom fixed inset-x-0 bottom-0 z-50 px-3 pb-3 sm:px-6">
          <div className="mx-auto max-w-[1400px]">
            <button
              type="button"
              onClick={() => setSacolaAberta(true)}
              className={cn(
                "group flex w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#141414]/95 p-2.5 pl-4 shadow-[0_-20px_60px_-20px_rgba(0,0,0,0.95)] backdrop-blur-xl transition hover:border-primary/50",
                pulsoCarrinho && "cart-pop",
              )}
            >
              <span className="flex min-w-0 items-center gap-3">
                <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary text-white shadow-[0_10px_28px_-10px_rgba(229,9,20,0.9)]">
                  <ShoppingBag className="h-4 w-4" />
                  <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full border border-[#141414] bg-white px-1 text-[10px] font-bold text-[#090909]">
                    {carrinho.quantidade}
                  </span>
                </span>
                <span className="min-w-0 text-left">
                  <span className="block text-[10px] uppercase tracking-[0.18em] text-white/45">
                    {carrinho.quantidade} {carrinho.quantidade === 1 ? "item" : "itens"}
                  </span>
                  <span className="block text-sm font-semibold text-white">{moedaBRL(carrinho.subtotal)}</span>
                </span>
              </span>
              <span className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-primary px-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-white transition group-hover:brightness-110">
                Ver pedido <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </button>
          </div>
        </div>
      ) : null}

      <ProdutoModal
        produto={produto}
        aberto={Boolean(produto)}
        aoFechar={() => setProduto(null)}
        aoAdicionar={(dados) => {
          carrinho.adicionar({ ...dados, observacao: dados.observacao });
        }}
        bloqueado={bloqueado}
        nomeEstabelecimento={config.nome_estabelecimento}
        logoUrl={config.logo_url}
      />
      <ComboModal
        combo={combo}
        aberto={Boolean(combo)}
        aoFechar={() => setCombo(null)}
        aoAdicionar={(dados) => {
          carrinho.adicionar({ ...dados, adicionais: [], observacao: dados.observacao });
        }}
        bloqueado={bloqueado}
      />
      <CartDrawer
        aberto={sacolaAberta}
        aoFechar={() => setSacolaAberta(false)}
        config={config}
        itens={carrinho.itens}
        subtotal={carrinho.subtotal}
        alterar={carrinho.alterar}
        remover={carrinho.remover}
        limpar={carrinho.limpar}
        abertoLoja={aberto}
      />
    </PublicLayout>
  );
}

function Hero({
  config,
  banner,
  horarios,
}: {
  config: CardapioPublico["configuracoes"];
  banner: CardapioPublico["banners"][number] | undefined;
  horarios: CardapioPublico["horarios"];
}) {
  const imagem = config.banner_url ?? banner?.imagem_url ?? HERO_POSTER;
  const semMovimento = usePrefersReducedMotion();
  const [videoFalhou, setVideoFalhou] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (semMovimento) return;
    const video = videoRef.current;
    if (!video) return;
    const tentar = () => {
      void video.play().catch(() => undefined);
    };
    tentar();
    const eventos = ["pointerdown", "touchstart", "keydown", "scroll"] as const;
    eventos.forEach((evento) => window.addEventListener(evento, tentar, { once: true, passive: true }));
    return () => eventos.forEach((evento) => window.removeEventListener(evento, tentar));
  }, [semMovimento]);

  return (
    <section id="inicio" className="relative isolate min-h-[100svh] overflow-hidden bg-[#090909]">
      <div className="absolute inset-0">
        <img
          src={imagem}
          alt=""
          className="hero-media h-full w-full object-cover"
          loading="eager"
          fetchPriority="high"
        />
        {!semMovimento ? (
          <video
            ref={videoRef}
            className={cn(
              "hero-media absolute inset-0 h-full w-full object-cover transition-opacity duration-1000",
              videoFalhou && "hidden",
            )}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            poster={imagem}
            aria-hidden
            onError={() => setVideoFalhou(true)}
          >
            <source src={HERO_VIDEO_DESKTOP} media="(min-width: 768px)" type="video/mp4" />
            <source src={HERO_VIDEO_MOBILE} type="video/mp4" />
          </video>
        ) : null}
      </div>

      <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/40 to-black/10" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#090909] via-[#090909]/25 to-transparent" />
      <div className="absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-black/80 to-transparent" />

      <div className="relative mx-auto flex min-h-[100svh] max-w-[1400px] flex-col justify-end px-4 pb-16 pt-28 sm:px-6 sm:pb-20 lg:pb-24">
        <div className="max-w-3xl">
          <p className="hero-up flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.3em] text-gold">
            <span className="h-px w-10 bg-gold/60" /> Smash burger • Artesanal
          </p>
          <h1 className="hero-up mt-3 font-display text-[clamp(4.8rem,16vw,11rem)] leading-[0.78] tracking-[0.02em] text-white" style={{ animationDelay: "90ms" }}>
            BOM PA POXA
          </h1>
          <p className="hero-up mt-5 max-w-xl text-lg leading-relaxed text-white/70 sm:text-xl" style={{ animationDelay: "180ms" }}>
            O sabor que transforma qualquer fome em vontade de repetir.
          </p>
          <div className="hero-up mt-8 flex flex-wrap gap-3" style={{ animationDelay: "270ms" }}>
            <a href="#cardapio" className="inline-flex">
              <Button size="lg" className="h-12 px-6 text-xs uppercase tracking-[0.16em]">
                Ver cardápio <ArrowRight className="h-4 w-4" />
              </Button>
            </a>
            <a href="#a-casa" className="inline-flex">
              <Button
                variant="outline"
                size="lg"
                className="h-12 border-white/25 bg-white/5 px-6 text-xs uppercase tracking-[0.16em] text-white hover:bg-white/10"
              >
                Conhecer a casa
              </Button>
            </a>
          </div>
          <div
            className="hero-up mt-8 flex flex-wrap gap-x-5 gap-y-3 text-[10px] uppercase tracking-[0.16em] text-white/45"
            style={{ animationDelay: "360ms" }}
          >
            {config.aceita_delivery ? (
              <span className="inline-flex items-center gap-1.5">
                <Bike className="h-3.5 w-3.5 text-gold" /> Entrega em até {config.tempo_entrega_min} min
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1.5">
              <ShoppingBag className="h-3.5 w-3.5 text-gold" /> Pedido mínimo {moedaBRL(config.pedido_minimo)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CreditCard className="h-3.5 w-3.5 text-gold" />
              {config.formas_pagamento.map((forma) => FORMA_PAGAMENTO_LABEL[forma] ?? forma).join(" • ")}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-gold" /> {resumoFuncionamento(horarios)}
            </span>
          </div>
        </div>
      </div>

      <a
        href="#cardapio"
        aria-label="Rolar para o cardápio"
        className="absolute bottom-5 right-5 hidden items-center gap-2 text-[9px] uppercase tracking-[0.28em] text-white/35 transition hover:text-gold sm:flex"
      >
        <span className="vertical-text">Scroll</span>
        <span className="grid h-9 w-9 place-items-center rounded-full border border-white/15 bg-black/25 backdrop-blur">
          <ArrowDown className="h-4 w-4" />
        </span>
      </a>
    </section>
  );
}

function CollectionRow({
  id,
  eyebrow,
  title,
  description,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const faixa = useRef<HTMLDivElement>(null);

  const rolar = (direcao: 1 | -1) => {
    const elemento = faixa.current;
    if (!elemento) return;
    elemento.scrollBy({ left: direcao * Math.min(elemento.clientWidth * 0.85, 760), behavior: "smooth" });
  };

  return (
    <section id={id} data-secao className="cinema-glow scroll-mt-48 py-8 sm:py-10">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6">
        <Reveal className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h2 className="mt-2 font-display text-5xl uppercase leading-none text-white sm:text-6xl">{title}</h2>
            {description ? <p className="mt-2 max-w-xl text-sm text-white/45">{description}</p> : null}
          </div>
          <div className="hidden items-center gap-2 sm:flex">
            <button
              type="button"
              onClick={() => rolar(-1)}
              aria-label={`Voltar em ${title}`}
              className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/[0.03] text-white/55 transition hover:border-gold/40 hover:text-gold"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => rolar(1)}
              aria-label={`Avançar em ${title}`}
              className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/[0.03] text-white/55 transition hover:border-gold/40 hover:text-gold"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </Reveal>

        <div
          ref={faixa}
          className="hide-scrollbar -mx-4 mt-5 flex snap-x snap-mandatory items-stretch gap-3 overflow-x-auto scroll-px-4 px-4 pb-2 sm:mx-0 sm:gap-4 sm:px-0"
        >
          {children}
        </div>
      </div>
    </section>
  );
}

function SecaoCategoria({
  categoria,
  produtos,
  aoAbrir,
  aoAdicionar,
}: {
  categoria: Categoria;
  produtos: Produto[];
  aoAbrir: (produto: Produto) => void;
  aoAdicionar: (produto: Produto) => void;
}) {
  if (!produtos.length) return null;
  return (
    <CollectionRow
      id={`cat-${categoria.id}`}
      eyebrow="Cardápio"
      title={categoria.nome}
      description={categoria.descricao ?? undefined}
    >
      {produtos.map((produto, indice) => (
        <Reveal
          key={produto.id}
          delay={indice * 60}
          className="w-[82vw] max-w-[330px] shrink-0 snap-start sm:w-[300px] lg:w-[340px]"
        >
          <ProdutoCard produto={produto} aoAbrir={aoAbrir} aoAdicionar={aoAdicionar} />
        </Reveal>
      ))}
    </CollectionRow>
  );
}

function AboutSection({
  config,
  horarios,
  imagem,
}: {
  config: CardapioPublico["configuracoes"];
  horarios: CardapioPublico["horarios"];
  imagem: string | null;
}) {
  const stats = [
    { icone: Flame, titulo: "Feito na hora", texto: "Carne prensada na chapa" },
    { icone: Bike, titulo: `${config.tempo_entrega_min} min`, texto: "Entrega estimada" },
    { icone: Store, titulo: resumoFuncionamento(horarios), texto: "Funcionamento" },
  ];
  return (
    <section id="a-casa" className="relative overflow-hidden border-y border-white/10 bg-[#0b0b0b] py-14 sm:py-20">
      <div className="absolute inset-0 cinema-glow opacity-70" />
      <div className="relative mx-auto grid max-w-[1400px] items-center gap-10 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Reveal className="relative">
          <div className="aspect-[4/5] overflow-hidden rounded-[2rem] border border-white/10 bg-[#141414] sm:aspect-[5/4]">
            {imagem ? (
              <img src={imagem} alt="Burger artesanal da casa" loading="lazy" className="h-full w-full object-cover" />
            ) : (
              <div className="pattern-hero grid h-full place-items-center p-8 text-center text-white/60">BOM PA POXA</div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
          </div>
          <span className="absolute -bottom-4 right-4 rounded-full border border-gold/35 bg-[#090909] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-gold shadow-xl sm:right-6">
            Feito na chapa
          </span>
        </Reveal>
        <Reveal delay={120}>
          <p className="eyebrow">A casa</p>
          <h2 className="mt-3 font-display text-5xl uppercase leading-[0.9] text-white sm:text-6xl lg:text-7xl">
            Carne, fogo e atitude.
          </h2>
          <p className="mt-5 max-w-xl text-sm leading-relaxed text-white/55 sm:text-base">
            Smash burgers prensados na chapa, pão brioche macio, cheddar derretendo e ingredientes escolhidos a dedo.
            Uma hamburgueria artesanal feita para quem leva sabor a sério.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {stats.map(({ icone: Icone, titulo, texto }) => (
              <div key={titulo} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <Icone className="h-4 w-4 text-gold" />
                <p className="mt-3 text-sm font-semibold text-white">{titulo}</p>
                <p className="mt-0.5 text-[11px] text-white/40">{texto}</p>
              </div>
            ))}
          </div>
          <a href="#cardapio" className="mt-8 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-gold transition hover:text-white">
            Ver o cardápio <ArrowRight className="h-4 w-4" />
          </a>
        </Reveal>
      </div>
    </section>
  );
}

function ReviewsSection({ avaliacoes, media }: { avaliacoes: CardapioPublico["avaliacoes"]; media: number }) {
  return (
    <section id="avaliacoes" className="mx-auto max-w-[1400px] scroll-mt-48 px-4 py-14 sm:px-6">
      <Reveal className="flex flex-wrap items-end justify-between gap-4 border-t border-white/10 pt-10">
        <div>
          <p className="eyebrow">Quem já pediu</p>
          <h2 className="mt-2 font-display text-5xl uppercase leading-none text-white sm:text-6xl">Avaliações</h2>
        </div>
        {avaliacoes.length ? (
          <div className="flex items-center gap-2">
            <Estrelas nota={media} />
            <span className="text-sm font-semibold text-white">{media.toFixed(1)}</span>
            <span className="text-xs text-white/40">({avaliacoes.length})</span>
          </div>
        ) : null}
      </Reveal>
      {avaliacoes.length ? (
        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {avaliacoes.slice(0, 6).map((avaliacao, indice) => (
            <Reveal key={avaliacao.id} delay={indice * 60} className="h-full">
              <article className="flex h-full flex-col rounded-2xl border border-white/10 bg-[#141414] p-5">
                <Estrelas nota={avaliacao.nota} />
                {avaliacao.comentario ? (
                  <p className="mt-4 flex-1 text-sm leading-relaxed text-white/70">“{avaliacao.comentario}”</p>
                ) : null}
                <p className="mt-5 text-[11px] uppercase tracking-[0.12em] text-white/35">
                  {avaliacao.cliente_nome ?? "Cliente"} • {dataBR(avaliacao.created_at)}
                </p>
              </article>
            </Reveal>
          ))}
        </div>
      ) : (
        <EstadoVazio
          className="mt-7"
          titulo="Ainda não há avaliações"
          descricao="As avaliações aparecem aqui depois que os clientes recebem os pedidos."
          icone={<Star className="h-6 w-6" />}
        />
      )}
    </section>
  );
}

function Chip({ ativo, onClick, children }: { ativo: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full border px-3.5 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] transition",
        ativo
          ? "border-primary bg-primary text-white shadow-[0_10px_26px_-14px_rgba(229,9,20,0.9)]"
          : "border-white/10 bg-white/[0.03] text-white/50 hover:border-gold/40 hover:text-white",
      )}
    >
      {children}
    </button>
  );
}

function CarregandoCardapio() {
  return (
    <div className="theme-cinema min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <div className="space-y-4">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-20 w-full max-w-lg" />
            <Skeleton className="h-5 w-80" />
            <Skeleton className="h-12 w-44 rounded-full" />
          </div>
          <Skeleton className="aspect-[16/10] rounded-3xl" />
        </div>
        <div className="mt-10 flex gap-4 overflow-hidden">
          {[0, 1, 2, 3].map((n) => (
            <div key={n} className="w-64 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-[#141414]">
              <Skeleton className="aspect-[4/3] rounded-none" />
              <div className="space-y-2 p-4">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ErroCardapio({ mensagem, tentarNovamente }: { mensagem: string; tentarNovamente: () => void }) {
  return (
    <div className="theme-cinema min-h-screen bg-background px-4 py-16 text-foreground">
      <div className="mx-auto max-w-2xl">
        <div className="text-center">
          <p className="eyebrow">BOM PA POXA</p>
          <h1 className="mt-3 font-display text-6xl uppercase leading-none text-white">Cardápio em preparação</h1>
          <p className="mt-4 text-sm text-white/50">
            Não conseguimos abrir o cardápio agora. Se você é o administrador, confira a conexão com o Supabase e as migrations.
          </p>
        </div>
        <div className="mt-8">
          <EstadoErro mensagem={mensagem} aoTentarNovamente={tentarNovamente} />
        </div>
        <div className="mt-6 flex justify-center gap-3">
          <Link to="/login">
            <Button variant="outline">Área do estabelecimento</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

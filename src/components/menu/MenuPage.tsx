import { useDeferredValue, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Bike,
  Clock,
  CreditCard,
  MessageCircle,
  RefreshCw,
  Search,
  ShoppingBag,
  Star,
  Store,
  X,
} from "lucide-react";
import { Badge, EstadoErro, EstadoVazio, Skeleton } from "@/components/ui/feedback";
import { Button } from "@/components/ui/button";
import { useCarrinho } from "@/hooks/use-cart";
import { cardapioQuery } from "@/lib/queries";
import { linkWhatsApp, urlExterna } from "@/lib/contact";
import { dataBR, moedaBRL } from "@/lib/format";
import { resumoFuncionamento, rotuloAbertura } from "@/lib/hours";
import { FORMA_PAGAMENTO_LABEL } from "@/lib/order-status";
import { useTitulo } from "@/lib/page-title";
import type { CardapioPublico, Categoria, Combo, Produto } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CartDrawer } from "./CartDrawer";
import { ComboModal } from "./ComboModal";
import { Estrelas } from "./common";
import { ProdutoCard } from "./ProductCard";
import { ProdutoModal } from "./ProductModal";
import { ComboCard } from "./ComboCard";
import { PublicLayout } from "@/components/layout/PublicLayout";

export function MenuPage() {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery(cardapioQuery);
  useTitulo(data?.configuracoes.nome_estabelecimento, data?.configuracoes.descricao ?? undefined);

  if (isLoading) return <CarregandoCardapio />;
  if (isError || !data) {
    return <ErroCardapio mensagem={error instanceof Error ? error.message : "Não foi possível abrir o cardápio."} tentarNovamente={() => void refetch()} />;
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

  const bloqueado = !config.aceitando_pedidos;
  const categoriasVisiveis = useMemo(
    () => categorias.filter((categoria) => produtos.some((p) => p.categoria_id === categoria.id)),
    [categorias, produtos],
  );
  const destaques = useMemo(() => produtos.filter((p) => p.destaque && p.disponivel).slice(0, 6), [produtos]);

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
  const bannersNaSecao = useMemo(
    () => (heroTemImagem ? banners.slice(1) : banners),
    [banners, heroTemImagem],
  );

  useEffect(() => {
    if (termo) return;
    const secoes = Array.from(document.querySelectorAll<HTMLElement>("[data-secao]"));
    if (!secoes.length) return;
    const observer = new IntersectionObserver(
      (entradas) => {
        const visivel = entradas.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visivel?.target.id) setAtivo(visivel.target.id);
      },
      { rootMargin: "-30% 0px -60% 0px", threshold: [0.1, 0.4] },
    );
    secoes.forEach((secao) => observer.observe(secao));
    return () => observer.disconnect();
  }, [termo, categoriasVisiveis.length, destaques.length, combos.length, bannersNaSecao.length]);

  const irPara = (id: string) => {
    setBusca("");
    setAtivo(id);
    window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }), 30);
  };

  const whatsapp = linkWhatsApp(config.whatsapp ?? config.telefone);
  const vazio = produtos.length === 0 && combos.length === 0;
  const media = avaliacoes.length ? avaliacoes.reduce((soma, a) => soma + a.nota, 0) / avaliacoes.length : 0;

  return (
    <PublicLayout config={config} horarios={horarios} aberto={aberto}>
      <div className={cn(carrinho.quantidade > 0 && "pb-24")}>
        <Hero config={config} banner={banners[0]} aberto={aberto} horarios={horarios} whatsapp={whatsapp} />

        {vazio ? (
          <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
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
            <nav className="sticky top-16 z-30 border-b border-border bg-background/92 backdrop-blur-md" aria-label="Categorias do cardápio">
              <div className="mx-auto max-w-6xl px-4 py-3 sm:px-6">
                <div className="flex items-center gap-2">
                  <div className="relative min-w-0 flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      value={busca}
                      onChange={(event) => setBusca(event.target.value)}
                      placeholder="Buscar no cardápio…"
                      aria-label="Buscar no cardápio"
                      className="h-10 w-full rounded-full border border-border bg-card pl-9 pr-9 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
                    />
                    {busca ? (
                      <button
                        type="button"
                        onClick={() => setBusca("")}
                        aria-label="Limpar busca"
                        className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-secondary"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={atualizar}
                    aria-label="Atualizar cardápio"
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border bg-card text-muted-foreground transition hover:bg-secondary"
                  >
                    <RefreshCw className={cn("h-4 w-4", atualizando && "animate-spin")} />
                  </button>
                </div>

                {!termo ? (
                  <div className="hide-scrollbar -mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-0.5">
                    {bannersNaSecao.length ? (
                      <Chip ativo={ativo === "novidades"} onClick={() => irPara("novidades")}>
                        Novidades
                      </Chip>
                    ) : null}
                    {destaques.length ? (
                      <Chip ativo={ativo === "destaques"} onClick={() => irPara("destaques")}>
                        Destaques
                      </Chip>
                    ) : null}
                    {combos.length ? (
                      <Chip ativo={ativo === "combos"} onClick={() => irPara("combos")}>
                        Combos
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
              <div className="mx-auto max-w-6xl px-4 pt-5 sm:px-6">
                <div className="rounded-xl border border-accent/40 bg-accent/10 px-4 py-3 text-sm">
                  {config.aceitando_pedidos
                    ? "Estamos fechados agora. Você pode ver o cardápio e voltar quando abrirmos."
                    : "Os pedidos estão pausados neste momento. Volte em breve."}
                </div>
              </div>
            ) : null}

            {!termo && bannersNaSecao.length ? (
              <section id="novidades" data-secao className="mx-auto max-w-6xl scroll-mt-36 px-4 pt-8 sm:px-6">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="eyebrow">Novidades</p>
                    <h2 className="mt-1 text-3xl sm:text-4xl">Da casa</h2>
                  </div>
                </div>
                <div className="hide-scrollbar mt-5 flex snap-x gap-3 overflow-x-auto pb-1">
                  {bannersNaSecao.map((banner) => {
                    const link = urlExterna(banner.link_url);
                    const conteudo = (
                      <>
                        <div className="relative aspect-[16/9] overflow-hidden rounded-xl bg-secondary">
                          {banner.imagem_url ? (
                            <img src={banner.imagem_url} alt={banner.titulo} className="h-full w-full object-cover" />
                          ) : (
                            <div className="pattern-hero grid h-full place-items-center p-4 text-center">
                              <span className="font-display text-xl text-foreground">{banner.titulo}</span>
                            </div>
                          )}
                        </div>
                        <p className="mt-2 line-clamp-2 text-sm font-medium">{banner.titulo}</p>
                        {banner.subtitulo ? <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{banner.subtitulo}</p> : null}
                      </>
                    );
                    return link ? (
                      <a
                        key={banner.id}
                        href={link}
                        target="_blank"
                        rel="noreferrer"
                        className="w-64 shrink-0 snap-start rounded-2xl border border-border bg-card p-2.5 transition hover:bg-secondary/40 sm:w-72"
                      >
                        {conteudo}
                      </a>
                    ) : (
                      <div key={banner.id} className="w-64 shrink-0 snap-start rounded-2xl border border-border bg-card p-2.5 sm:w-72">
                        {conteudo}
                      </div>
                    );
                  })}
                </div>
              </section>
            ) : null}

            {termo ? (
              <section id="resultados" className="mx-auto max-w-6xl scroll-mt-36 px-4 py-10 sm:px-6">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="eyebrow">Busca</p>
                    <h2 className="mt-1 text-3xl">Resultados para “{buscaAdiada.trim()}”</h2>
                  </div>
                  <span className="text-sm text-muted-foreground">{resultados.length + resultadosCombos.length} item(ns)</span>
                </div>
                {resultados.length ? (
                  <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {resultados.map((item, indice) => (
                      <ProdutoCard key={item.id} produto={item} aoAbrir={setProduto} atraso={indice * 25} />
                    ))}
                  </div>
                ) : null}
                {resultadosCombos.length ? (
                  <div className="mt-8">
                    <p className="eyebrow">Combos</p>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {resultadosCombos.map((item) => (
                        <ComboCard key={item.id} combo={item} aoAbrir={setCombo} />
                      ))}
                    </div>
                  </div>
                ) : null}
                {!resultados.length && !resultadosCombos.length ? (
                  <EstadoVazio
                    className="mt-6"
                    titulo="Nada encontrado"
                    descricao="Tente outro nome, ingrediente ou prato."
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
                {destaques.length ? (
                  <section id="destaques" data-secao className="mx-auto max-w-6xl scroll-mt-36 px-4 py-10 sm:px-6">
                    <div className="flex items-end justify-between gap-4">
                      <div>
                        <p className="eyebrow">Escolhas da casa</p>
                        <h2 className="mt-1 text-3xl sm:text-4xl">Destaques</h2>
                      </div>
                      <span className="hidden text-sm text-muted-foreground sm:block">Os favoritos de quem já provou</span>
                    </div>
                    <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {destaques.map((item, indice) => (
                        <ProdutoCard key={item.id} produto={item} aoAbrir={setProduto} atraso={indice * 25} />
                      ))}
                    </div>
                  </section>
                ) : null}

                {combos.length ? (
                  <section id="combos" data-secao className="mx-auto max-w-6xl scroll-mt-36 px-4 py-8 sm:px-6">
                    <div>
                      <p className="eyebrow">Para compartilhar</p>
                      <h2 className="mt-1 text-3xl sm:text-4xl">Combos</h2>
                    </div>
                    <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {combos.map((item) => (
                        <ComboCard key={item.id} combo={item} aoAbrir={setCombo} />
                      ))}
                    </div>
                  </section>
                ) : null}

                {categoriasVisiveis.map((categoria) => (
                  <SecaoCategoria
                    key={categoria.id}
                    categoria={categoria}
                    produtos={produtos.filter((p) => p.categoria_id === categoria.id)}
                    aoAbrir={setProduto}
                  />
                ))}

                <section id="avaliacoes" className="mx-auto max-w-6xl scroll-mt-36 px-4 py-12 sm:px-6">
                  <div className="flex flex-wrap items-end justify-between gap-4 border-t border-border pt-10">
                    <div>
                      <p className="eyebrow">Quem já pediu</p>
                      <h2 className="mt-1 text-3xl sm:text-4xl">Avaliações</h2>
                    </div>
                    {avaliacoes.length ? (
                      <div className="flex items-center gap-2">
                        <Estrelas nota={media} />
                        <span className="text-sm font-medium">{media.toFixed(1)}</span>
                        <span className="text-sm text-muted-foreground">({avaliacoes.length})</span>
                      </div>
                    ) : null}
                  </div>
                  {avaliacoes.length ? (
                    <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {avaliacoes.slice(0, 6).map((avaliacao) => (
                        <article key={avaliacao.id} className="rounded-2xl border border-border bg-card p-5">
                          <Estrelas nota={avaliacao.nota} />
                          {avaliacao.comentario ? <p className="mt-3 text-sm leading-relaxed">“{avaliacao.comentario}”</p> : null}
                          <p className="mt-4 text-xs text-muted-foreground">
                            {avaliacao.cliente_nome ?? "Cliente"} • {dataBR(avaliacao.created_at)}
                          </p>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <EstadoVazio
                      className="mt-6"
                      titulo="Ainda não há avaliações"
                      descricao="As avaliações aparecem aqui depois que os clientes recebem os pedidos."
                      icone={<Star className="h-6 w-6" />}
                    />
                  )}
                </section>
              </>
            )}
          </>
        )}
      </div>

      {carrinho.quantidade > 0 ? (
        <div className="safe-bottom fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 px-4 pt-3 backdrop-blur-md sm:px-6">
          <div className="mx-auto max-w-6xl">
            <button
              type="button"
              onClick={() => setSacolaAberta(true)}
              className="flex w-full items-center justify-between gap-4 rounded-full bg-primary px-5 py-3.5 text-primary-foreground shadow-lg transition hover:brightness-95"
            >
              <span className="flex items-center gap-2 text-sm font-medium">
                <ShoppingBag className="h-4 w-4" />
                {carrinho.quantidade} {carrinho.quantidade === 1 ? "item" : "itens"}
              </span>
              <span className="flex items-center gap-2 text-sm font-semibold">
                {moedaBRL(carrinho.subtotal)} <ArrowRight className="h-4 w-4" />
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
  aberto,
  horarios,
  whatsapp,
}: {
  config: CardapioPublico["configuracoes"];
  banner: CardapioPublico["banners"][number] | undefined;
  aberto: boolean;
  horarios: CardapioPublico["horarios"];
  whatsapp: string | null;
}) {
  const imagem = config.banner_url ?? banner?.imagem_url ?? null;
  return (
    <section id="inicio" className="relative overflow-hidden">
      <div className="pattern-hero absolute inset-0 opacity-60" />
      <div className="relative mx-auto grid max-w-6xl items-center gap-8 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[1.05fr_0.95fr] lg:py-16">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge cor={aberto && config.aceitando_pedidos ? "success" : "neutral"}>
              <span className={cn("h-1.5 w-1.5 rounded-full", aberto && config.aceitando_pedidos ? "bg-success" : "bg-muted-foreground")} />
              {rotuloAbertura(config, horarios, aberto)}
            </Badge>
            <Badge>{resumoFuncionamento(horarios)}</Badge>
          </div>
          <h1 className="mt-5 text-[2.6rem] leading-[0.98] sm:text-6xl lg:text-7xl">{config.nome_estabelecimento}</h1>
          <p className="mt-4 max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">
            {banner?.subtitulo || config.descricao || config.mensagem_boas_vindas || "Comida boa, feita com carinho."}
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a href="#cardapio" className="inline-flex">
              <Button size="lg">
                Ver cardápio <ArrowRight className="h-4 w-4" />
              </Button>
            </a>
            {whatsapp ? (
              <a href={whatsapp} target="_blank" rel="noreferrer" className="inline-flex">
                <Button variant="outline" size="lg">
                  <MessageCircle className="h-4 w-4" /> Falar no WhatsApp
                </Button>
              </a>
            ) : null}
          </div>
          <div className="mt-7 flex flex-wrap gap-x-6 gap-y-3 text-xs text-muted-foreground">
            {config.aceita_delivery ? (
              <span className="inline-flex items-center gap-1.5">
                <Bike className="h-4 w-4" /> Entrega em até {config.tempo_entrega_min} min
              </span>
            ) : null}
            {config.aceita_retirada ? (
              <span className="inline-flex items-center gap-1.5">
                <Store className="h-4 w-4" /> Retirada em até {config.tempo_retirada_min} min
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1.5">
              <CreditCard className="h-4 w-4" /> {config.formas_pagamento.map((f) => FORMA_PAGAMENTO_LABEL[f] ?? f).join(" • ")}
            </span>
          </div>
        </div>

        <div className="relative">
          <div className="aspect-[16/9] overflow-hidden rounded-3xl border border-border bg-card shadow-xl">
            {imagem ? (
              <img src={imagem} alt={config.nome_estabelecimento} className="h-full w-full object-cover" />
            ) : (
              <div className="relative grid h-full place-items-center overflow-hidden bg-secondary/60 p-8 text-center">
                <div className="absolute inset-0 pattern-hero opacity-70" />
                <div className="relative">
                  <p className="eyebrow">Bem-vindo</p>
                  <p className="mt-3 font-display text-3xl text-foreground sm:text-4xl">
                    {banner?.titulo && banner.titulo.toLowerCase() !== config.nome_estabelecimento.toLowerCase()
                      ? banner.titulo
                      : "Sinta-se em casa"}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {config.mensagem_boas_vindas || banner?.subtitulo || "Monte seu pedido direto pelo celular."}
                  </p>
                </div>
              </div>
            )}
          </div>
          <div className="absolute -bottom-4 left-4 right-4 rounded-2xl border border-border bg-card/95 p-3.5 shadow-lg backdrop-blur sm:left-6 sm:right-6">
            <div className="grid grid-cols-3 divide-x divide-border text-center text-xs">
              <div className="px-2">
                {config.aceita_delivery ? <Bike className="mx-auto h-4 w-4 text-primary" /> : <Store className="mx-auto h-4 w-4 text-primary" />}
                <p className="mt-1 font-medium">
                  {config.aceita_delivery ? moedaBRL(config.taxa_entrega) : "Retirada"}
                </p>
                <p className="text-[10px] text-muted-foreground">{config.aceita_delivery ? "entrega" : "no local"}</p>
              </div>
              <div className="px-2">
                <ShoppingBag className="mx-auto h-4 w-4 text-primary" />
                <p className="mt-1 font-medium">{moedaBRL(config.pedido_minimo)}</p>
                <p className="text-[10px] text-muted-foreground">pedido mínimo</p>
              </div>
              <div className="px-2">
                <Clock className="mx-auto h-4 w-4 text-primary" />
                <p className="mt-1 font-medium">
                  {config.aceita_delivery ? config.tempo_entrega_min : config.tempo_retirada_min} min
                </p>
                <p className="text-[10px] text-muted-foreground">estimativa</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div id="cardapio" className="scroll-mt-16" />
    </section>
  );
}

function SecaoCategoria({
  categoria,
  produtos,
  aoAbrir,
}: {
  categoria: Categoria;
  produtos: Produto[];
  aoAbrir: (produto: Produto) => void;
}) {
  if (!produtos.length) return null;
  return (
    <section id={`cat-${categoria.id}`} data-secao className="mx-auto max-w-6xl scroll-mt-36 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-end gap-3">
          {categoria.imagem_url ? (
            <img src={categoria.imagem_url} alt="" className="hidden h-16 w-24 rounded-xl object-cover sm:block" />
          ) : null}
          <div>
            <p className="eyebrow">Cardápio</p>
            <h2 className="mt-1 text-3xl sm:text-4xl">{categoria.nome}</h2>
            {categoria.descricao ? <p className="mt-1 max-w-xl text-sm text-muted-foreground">{categoria.descricao}</p> : null}
          </div>
        </div>
        {categoria.destaque ? <Badge cor="accent">Destaque da casa</Badge> : null}
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {produtos.map((produto, indice) => (
          <ProdutoCard key={produto.id} produto={produto} aoAbrir={aoAbrir} atraso={indice * 25} />
        ))}
      </div>
    </section>
  );
}

function Chip({ ativo, onClick, children }: { ativo: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full border px-4 py-2 text-xs font-medium transition",
        ativo ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function CarregandoCardapio() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="mt-12 grid gap-8 lg:grid-cols-2">
          <div className="space-y-4">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-16 w-full max-w-lg" />
            <Skeleton className="h-5 w-80" />
            <Skeleton className="h-11 w-40 rounded-full" />
          </div>
          <Skeleton className="aspect-[16/9] rounded-3xl" />
        </div>
        <div className="mt-12 space-y-4">
          <Skeleton className="h-10 w-full max-w-md rounded-full" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((n) => (
              <div key={n} className="overflow-hidden rounded-2xl border border-border bg-card">
                <Skeleton className="aspect-[16/10] rounded-none" />
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
    </div>
  );
}

function ErroCardapio({ mensagem, tentarNovamente }: { mensagem: string; tentarNovamente: () => void }) {
  return (
    <div className="min-h-screen bg-background px-4 py-16">
      <div className="mx-auto max-w-2xl">
        <div className="text-center">
          <p className="eyebrow">BOM PA POXA</p>
          <h1 className="mt-3 text-5xl">Cardápio em preparação</h1>
          <p className="mt-4 text-sm text-muted-foreground">
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


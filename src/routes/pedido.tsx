import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bike,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  MapPin,
  MessageSquare,
  Package,
  Phone,
  ReceiptText,
  RefreshCw,
  Star,
  Store,
} from "lucide-react";
import { toast } from "sonner";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/form";
import { Badge, EstadoErro, EstadoVazio, Skeleton } from "@/components/ui/feedback";
import { Estrelas } from "@/components/menu/common";
import { consultarPedido, avaliarPedido } from "@/lib/api";
import { sincronizarPagamentoOnline } from "@/lib/online-payments";
import {
  PAGAMENTO_STATUS_DESCRICAO,
  PAGAMENTO_STATUS_LABEL,
  metodoPagamentoLabel,
  pagamentoStatusCor,
} from "@/lib/payment-status";
import { dataBR, dataHoraBR, horaBR, moedaBRL } from "@/lib/format";
import { lerUltimoPedido } from "@/hooks/use-cart";
import { layoutPublicoQuery } from "@/lib/queries";
import { MODALIDADE_LABEL, STATUS_DESCRICAO, STATUS_LABEL, etapasPedido, indiceEtapa } from "@/lib/order-status";
import { useTitulo } from "@/lib/page-title";
import { estiloTema } from "@/lib/theme";
import type { Configuracoes, StatusPedidoRastreio } from "@/lib/types";
import { cn } from "@/lib/utils";

function textoBusca(valor: unknown): string | undefined {
  return typeof valor === "string" && valor.trim() ? valor : undefined;
}

export const Route = createFileRoute("/pedido")({
  validateSearch: (search: Record<string, unknown>) => ({
    id: textoBusca(search.id),
    token: textoBusca(search.token),
    order_nsu: textoBusca(search.order_nsu),
    transaction_nsu: textoBusca(search.transaction_nsu),
    slug: textoBusca(search.slug),
    capture_method: textoBusca(search.capture_method),
    receipt_url: textoBusca(search.receipt_url),
  }),
  component: PedidoPage,
});

function PedidoPage() {
  useTitulo("Acompanhar pedido", "Acompanhe o preparo e a entrega do seu pedido.");
  const search = Route.useSearch();
  const [ultimo] = useState(() => lerUltimoPedido());
  const id = search.id ?? ultimo?.id;
  const token = search.token ?? ultimo?.token;
  const layout = useQuery(layoutPublicoQuery);
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["pedido-publico", id, token],
    queryFn: () => consultarPedido(id!, token!),
    enabled: Boolean(id && token),
    refetchInterval: 20_000,
  });

  if (layout.isLoading || (isLoading && id && token)) return <Carregando />;
  if (layout.isError || !layout.data) {
    return (
      <PaginaSimples>
        <EstadoErro mensagem={layout.error instanceof Error ? layout.error.message : "Não foi possível carregar o cardápio."} aoTentarNovamente={() => void layout.refetch()} />
      </PaginaSimples>
    );
  }
  if (!id || !token) {
    return (
      <PublicLayout config={layout.data.configuracoes} horarios={layout.data.horarios} aberto={layout.data.aberto}>
        <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
          <EstadoVazio
            titulo="Nenhum pedido para acompanhar"
            descricao="Abra o link de acompanhamento enviado após a compra ou volte ao cardápio para fazer um novo pedido."
            icone={<Package className="h-6 w-6" />}
            acao={
              <Link to="/">
                <Button>Voltar ao cardápio</Button>
              </Link>
            }
          />
        </div>
      </PublicLayout>
    );
  }
  if (isError) {
    return (
      <PublicLayout config={layout.data.configuracoes} horarios={layout.data.horarios} aberto={layout.data.aberto}>
        <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
          <EstadoErro mensagem={error instanceof Error ? error.message : "Não encontramos este pedido."} aoTentarNovamente={() => void refetch()} />
        </div>
      </PublicLayout>
    );
  }
  if (!data) {
    return (
      <PublicLayout config={layout.data.configuracoes} horarios={layout.data.horarios} aberto={layout.data.aberto}>
        <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
          <EstadoVazio
            titulo="Pedido não encontrado"
            descricao="O link pode ter expirado ou o pedido não existe mais."
            acao={
              <Link to="/">
                <Button>Voltar ao cardápio</Button>
              </Link>
            }
          />
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout config={layout.data.configuracoes} horarios={layout.data.horarios} aberto={layout.data.aberto}>
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        <Link to="/" className="text-xs text-muted-foreground underline decoration-current/30 underline-offset-4 hover:decoration-current">
          ← Voltar ao cardápio
        </Link>
        <Acompanhamento
          pedido={data}
          token={token}
          config={layout.data.configuracoes}
          recarregar={() => void refetch()}
          retorno={{
            orderNsu: search.order_nsu,
            transactionNsu: search.transaction_nsu,
            slug: search.slug,
            captureMethod: search.capture_method,
            receiptUrl: search.receipt_url,
          }}
        />
      </div>
    </PublicLayout>
  );
}

function Acompanhamento({
  pedido,
  token,
  config,
  recarregar,
  retorno,
}: {
  pedido: StatusPedidoRastreio;
  token: string;
  config: Configuracoes;
  recarregar: () => void;
  retorno: {
    orderNsu?: string;
    transactionNsu?: string;
    slug?: string;
    captureMethod?: string;
    receiptUrl?: string;
  };
}) {
  const qc = useQueryClient();
  const [nota, setNota] = useState(5);
  const [comentario, setComentario] = useState("");
  const [nome, setNome] = useState(pedido.cliente_nome);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sincronizandoPagamento, setSincronizandoPagamento] = useState(false);
  const [erroPagamento, setErroPagamento] = useState<string | null>(null);
  const referenciaSincronizada = useRef<string | null>(null);
  const recarregarRef = useRef(recarregar);
  recarregarRef.current = recarregar;
  const etapas = useMemo(() => etapasPedido(pedido.modalidade), [pedido.modalidade]);
  const atual = indiceEtapa(pedido);
  const podeAvaliar = (pedido.status === "entregue" || pedido.status === "retirado") && !pedido.avaliacao;
  const pagamentoOnline = pedido.pagamento;
  const temPagamentoOnline = pedido.pagamento_provedor === "infinitepay";

  const verificarPagamento = async () => {
    setSincronizandoPagamento(true);
    setErroPagamento(null);
    try {
      const resposta = await sincronizarPagamentoOnline({
        pedidoId: pedido.id,
        trackingToken: token,
        forcar: true,
      });
      if (resposta.status === "aprovado") {
        toast.success("Pagamento aprovado pela InfinitePay.");
      } else if (resposta.mensagem) {
        toast.info(resposta.mensagem);
      } else {
        toast.info(`Status do pagamento: ${PAGAMENTO_STATUS_LABEL[resposta.status]}.`);
      }
      recarregar();
      await qc.invalidateQueries({ queryKey: ["pedido-publico"] });
    } catch (erroSync) {
      setErroPagamento(erroSync instanceof Error ? erroSync.message : "Não foi possível verificar o pagamento.");
    } finally {
      setSincronizandoPagamento(false);
    }
  };

  useEffect(() => {
    if (!retorno.transactionNsu || !retorno.slug) return;
    if (retorno.orderNsu && retorno.orderNsu !== pedido.id) return;
    const chave = `${retorno.transactionNsu}|${retorno.slug}`;
    if (referenciaSincronizada.current === chave) return;
    referenciaSincronizada.current = chave;

    let cancelado = false;
    setSincronizandoPagamento(true);
    setErroPagamento(null);
    void (async () => {
      try {
        const resposta = await sincronizarPagamentoOnline({
          pedidoId: pedido.id,
          trackingToken: token,
          forcar: true,
          transactionNsu: retorno.transactionNsu,
          slug: retorno.slug,
          captureMethod: retorno.captureMethod,
          receiptUrl: retorno.receiptUrl,
        });
        if (cancelado) return;
        if (resposta.status === "aprovado") {
          toast.success("Pagamento aprovado pela InfinitePay.");
        } else if (resposta.mensagem) {
          toast.info(resposta.mensagem);
        }
        recarregarRef.current();
        await qc.invalidateQueries({ queryKey: ["pedido-publico"] });
      } catch (erroSync) {
        if (!cancelado) {
          setErroPagamento(erroSync instanceof Error ? erroSync.message : "Não foi possível verificar o pagamento.");
        }
      } finally {
        if (!cancelado) setSincronizandoPagamento(false);
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [pedido.id, retorno.transactionNsu, retorno.slug, retorno.orderNsu, retorno.captureMethod, retorno.receiptUrl, token, qc]);

  const enviarAvaliacao = async () => {
    setErro(null);
    setEnviando(true);
    try {
      await avaliarPedido({
        pedidoId: pedido.id,
        token,
        nome,
        nota,
        comentario,
      });
      toast.success("Avaliação enviada. Obrigado!");
      await qc.invalidateQueries({ queryKey: ["pedido-publico"] });
      recarregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível enviar a avaliação.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="mt-5 space-y-5">
      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="bg-secondary/35 px-5 py-5 sm:px-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="eyebrow">Pedido</p>
              <h1 className="mt-1 text-3xl sm:text-4xl">#{pedido.numero}</h1>
              <p className="mt-1 text-sm text-muted-foreground">Feito em {dataHoraBR(pedido.created_at)}</p>
            </div>
            <div className="text-right">
              <Badge cor={pedido.status === "cancelado" ? "danger" : pedido.status === "entregue" || pedido.status === "retirado" ? "success" : "primary"}>
                {STATUS_LABEL[pedido.status]}
              </Badge>
              <p className="mt-2 text-2xl font-semibold">{moedaBRL(pedido.total)}</p>
            </div>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">{STATUS_DESCRICAO[pedido.status]}</p>
        </div>

        {pedido.status === "cancelado" ? (
          <div className="border-t border-border px-5 py-5 text-sm text-danger sm:px-7">
            Este pedido foi cancelado. Se tiver dúvidas, fale com o estabelecimento.
          </div>
        ) : (
          <div className="border-t border-border px-5 py-6 sm:px-7">
            <div className="flex items-center justify-between gap-1">
              {etapas.map((etapa, indice) => {
                const concluida = indice <= atual;
                const ultima = indice === etapas.length - 1;
                return (
                  <div key={etapa} className="flex flex-1 items-center last:flex-none">
                    <div className="flex min-w-0 flex-col items-center gap-2 text-center">
                      <span
                        className={cn(
                          "grid h-8 w-8 place-items-center rounded-full border text-xs",
                          concluida ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground",
                        )}
                      >
                        {concluida ? <Check className="h-4 w-4" /> : indice + 1}
                      </span>
                      <span className={cn("max-w-20 text-[10px] leading-tight sm:max-w-none sm:text-xs", concluida ? "font-medium" : "text-muted-foreground")}>
                        {STATUS_LABEL[etapa]}
                      </span>
                    </div>
                    {!ultima ? <span className={cn("mx-1 h-0.5 flex-1", indice < atual ? "bg-primary" : "bg-border")} /> : null}
                  </div>
                );
              })}
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" /> Atualizado {horaBR(pedido.updated_at)}
              </span>
              <button type="button" onClick={recarregar} className="underline underline-offset-4 hover:text-foreground">
                Atualizar agora
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-xl">
          <ReceiptText className="h-4 w-4" /> Itens do pedido
        </h2>
        <ul className="mt-4 divide-y divide-border">
          {pedido.itens.map((item) => (
            <li key={item.id} className="flex justify-between gap-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  {item.quantidade}x {item.nome}
                </p>
                {item.adicionais.length ? (
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{item.adicionais.map((a) => a.nome).join(" • ")}</p>
                ) : null}
                {item.observacao ? <p className="mt-0.5 text-[11px] italic text-muted-foreground">“{item.observacao}”</p> : null}
              </div>
              <span className="shrink-0 text-sm">{moedaBRL(item.preco_unitario * item.quantidade)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 space-y-1.5 border-t border-border pt-3 text-sm">
          <Linha rotulo="Subtotal" valor={moedaBRL(pedido.subtotal)} />
          {pedido.taxa_entrega > 0 ? <Linha rotulo="Entrega" valor={moedaBRL(pedido.taxa_entrega)} /> : null}
          {pedido.desconto > 0 ? <Linha rotulo="Desconto" valor={`− ${moedaBRL(pedido.desconto)}`} /> : null}
          <div className="flex justify-between pt-2 text-base font-semibold">
            <span>Total</span>
            <span>{moedaBRL(pedido.total)}</span>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="flex items-center gap-2 text-lg">
            {pedido.modalidade === "delivery" ? <Bike className="h-4 w-4" /> : <Store className="h-4 w-4" />}
            {MODALIDADE_LABEL[pedido.modalidade]}
          </h2>
          {pedido.modalidade === "delivery" ? (
            <div className="mt-3 flex gap-2 text-sm text-muted-foreground">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                {[pedido.endereco, pedido.numero_endereco, pedido.complemento].filter(Boolean).join(", ")}
                <br />
                {[pedido.bairro, pedido.cidade, pedido.cep].filter(Boolean).join(" • ")}
                {pedido.referencia ? <><br />Ref.: {pedido.referencia}</> : null}
              </p>
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              {[config.endereco, config.bairro, config.cidade].filter(Boolean).join(", ") || "Retirada no estabelecimento."}
            </p>
          )}
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="flex items-center gap-2 text-lg">
            <Phone className="h-4 w-4" /> Contato e pagamento
          </h2>
          <p className="mt-3 text-sm">{pedido.cliente_nome}</p>
          <p className="text-sm text-muted-foreground">{pedido.cliente_telefone}</p>
          <p className="mt-3 text-sm">
            Pagamento:{" "}
            {temPagamentoOnline
              ? metodoPagamentoLabel(pedido.forma_pagamento, "infinitepay", pedido.pagamento_online_tipo)
              : metodoPagamentoLabel(pedido.forma_pagamento, "manual")}
          </p>
          <p className="text-sm text-muted-foreground">Situação: {pedido.status_pagamento === "pago" ? "Pago" : "A pagar"}</p>
          {pedido.troco_para ? <p className="text-xs text-muted-foreground">Troco para {moedaBRL(pedido.troco_para)}</p> : null}
        </div>
      </section>

      {temPagamentoOnline ? (
        <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-xl">
              <ReceiptText className="h-4 w-4" /> Pagamento online
            </h2>
            <Badge cor={pagamentoStatusCor(pagamentoOnline?.status ?? "erro")}>
              {pagamentoOnline ? PAGAMENTO_STATUS_LABEL[pagamentoOnline.status] : "Aguardando registro"}
            </Badge>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {pagamentoOnline
              ? PAGAMENTO_STATUS_DESCRICAO[pagamentoOnline.status]
              : "O pedido foi registrado, mas o checkout da InfinitePay ainda não retornou."}
          </p>

          {pagamentoOnline?.status !== "aprovado" && pagamentoOnline?.checkout_url ? (
            <a href={pagamentoOnline.checkout_url} target="_blank" rel="noreferrer" className="mt-4 inline-flex">
              <Button variant="outline">
                <ExternalLink className="h-4 w-4" /> Abrir checkout InfinitePay
              </Button>
            </a>
          ) : null}

          {pagamentoOnline?.receipt_url ? (
            <a
              href={pagamentoOnline.receipt_url}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-xs text-primary underline decoration-current/30 underline-offset-4 hover:decoration-current"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Ver comprovante InfinitePay
            </a>
          ) : null}

          {pagamentoOnline?.ultimo_erro ? (
            <p className="mt-3 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{pagamentoOnline.ultimo_erro}</p>
          ) : null}
          {erroPagamento ? (
            <p className="mt-3 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{erroPagamento}</p>
          ) : null}

          {pagamentoOnline?.status === "aprovado" ? (
            <p className="mt-4 flex items-center gap-2 rounded-lg bg-success/10 px-3 py-2 text-sm text-success">
              <CheckCircle2 className="h-4 w-4" /> Pagamento confirmado pela InfinitePay.
            </p>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-4"
              carregando={sincronizandoPagamento}
              onClick={() => void verificarPagamento()}
            >
              <RefreshCw className="h-3.5 w-3.5" /> Verificar pagamento
            </Button>
          )}
        </section>
      ) : null}

      {pedido.observacoes ? (
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="flex items-center gap-2 text-lg">
            <MessageSquare className="h-4 w-4" /> Observações
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">{pedido.observacoes}</p>
        </section>
      ) : null}

      {podeAvaliar ? (
        <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <h2 className="flex items-center gap-2 text-xl">
            <Star className="h-4 w-4" /> Como foi seu pedido?
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">Sua avaliação ajuda o estabelecimento a melhorar cada vez mais.</p>
          <div className="mt-4 flex flex-wrap gap-1">
            {[1, 2, 3, 4, 5].map((valor) => (
              <button key={valor} type="button" onClick={() => setNota(valor)} aria-label={`${valor} estrela(s)`} className="p-0.5">
                <Star className={cn("h-8 w-8", valor <= nota ? "fill-accent text-accent" : "text-border")} />
              </button>
            ))}
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Input label="Seu nome" value={nome} onChange={(event) => setNome(event.target.value)} />
          </div>
          <div className="mt-4">
            <Textarea label="Comentário (opcional)" value={comentario} onChange={(event) => setComentario(event.target.value)} maxLength={1000} rows={3} />
          </div>
          {erro ? <p className="mt-3 text-sm text-danger">{erro}</p> : null}
          <Button className="mt-4" carregando={enviando} onClick={enviarAvaliacao} disabled={!nome.trim()}>
            Enviar avaliação
          </Button>
        </section>
      ) : pedido.avaliacao ? (
        <section className="rounded-2xl border border-border bg-card p-5 text-sm">
          <p className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="h-4 w-4 text-success" /> Avaliação enviada
          </p>
          <Estrelas nota={pedido.avaliacao.nota} className="mt-2" />
          {pedido.avaliacao.comentario ? <p className="mt-2 text-muted-foreground">“{pedido.avaliacao.comentario}”</p> : null}
          <p className="mt-2 text-xs text-muted-foreground">{pedido.avaliacao.aprovado ? "Publicada no cardápio." : "Aguardando aprovação do estabelecimento."}</p>
        </section>
      ) : null}

      {pedido.historico?.length ? (
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-lg">Histórico</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {pedido.historico.map((h, indice) => (
              <li key={`${h.created_at}-${indice}`} className="flex justify-between gap-4 text-muted-foreground">
                <span>{STATUS_LABEL[h.status_novo]}</span>
                <span>{horaBR(h.created_at)} • {dataBR(h.created_at)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="flex justify-center pb-6">
        <Link to="/">
          <Button variant="outline">Fazer outro pedido</Button>
        </Link>
      </div>
    </div>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex justify-between text-muted-foreground">
      <span>{rotulo}</span>
      <span className="text-foreground">{valor}</span>
    </div>
  );
}

function PaginaSimples({ children }: { children: ReactNode }) {
  return (
    <div style={estiloTema({
      cor_primaria: "#B23A2A",
      cor_secundaria: "#F1E3CF",
      cor_destaque: "#E8A33D",
      cor_fundo: "#FAF5EC",
      cor_texto: "#2A1710",
      tipografia: "fraunces_figtree",
    })} className="min-h-screen bg-background px-4 py-16">
      {children}
    </div>
  );
}

function Carregando() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-12 sm:px-6">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-48 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    </div>
  );
}


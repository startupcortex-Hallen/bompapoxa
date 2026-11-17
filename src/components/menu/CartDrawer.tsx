import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  MapPin,
  MessageCircle,
  MessageSquare,
  LoaderCircle,
  Plus,
  QrCode,
  ShoppingBag,
  Store,
  Ticket,
  Trash2,
  Truck,
} from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Drawer } from "@/components/ui/modal";
import { Input, Select, Textarea } from "@/components/ui/form";
import { EstadoVazio } from "@/components/ui/feedback";
import { fazerPedido, validarCupom } from "@/lib/api";
import { formatarTelefone, moedaBRL, somenteDigitos } from "@/lib/format";
import {
  buscarCep,
  buscarCoordenadasEndereco,
  formatarCep,
  type Coordenadas,
  type EnderecoGeocodificado,
} from "@/lib/geocoding";
import { MODALIDADE_LABEL } from "@/lib/order-status";
import type { Configuracoes, FormaPagamento, Modalidade, Produto, ResultadoPedido } from "@/lib/types";
import { paraPayload, type ItemCarrinho } from "@/lib/cart";
import { salvarUltimoPedido } from "@/hooks/use-cart";
import { cn } from "@/lib/utils";
import { ImagemProduto, precoVigente } from "./common";
import { MapaEndereco } from "./MapaEndereco";

type Etapa = "sacola" | "dados" | "sucesso";

const WHATSAPP_PEDIDOS = "5577998654823";

const PIX_RECEBEDOR = {
  nome: "João Victor Carvalho de Jesus",
  chave: "77998654823",
  tipo: "Telefone",
} as const;

type PagamentoCheckout = "pix" | "dinheiro" | "cartao_credito" | "cartao_debito";

const PAGAMENTO_LABEL: Record<PagamentoCheckout, string> = {
  pix: "PIX (antecipado)",
  dinheiro: "Dinheiro",
  cartao_credito: "Cartão de crédito (máquina)",
  cartao_debito: "Cartão de débito (máquina)",
};

function opcoesPagamento(formas: string[]): PagamentoCheckout[] {
  const opcoes: PagamentoCheckout[] = [];
  if (formas.includes("pix")) opcoes.push("pix");
  if (formas.includes("cartao")) opcoes.push("cartao_credito", "cartao_debito");
  if (formas.includes("dinheiro")) opcoes.push("dinheiro");
  return opcoes;
}

function formaInicial(formas: string[]): PagamentoCheckout {
  return opcoesPagamento(formas)[0] ?? "pix";
}

function formaParaApi(forma: PagamentoCheckout): FormaPagamento {
  return forma === "cartao_credito" || forma === "cartao_debito" ? "cartao" : forma;
}

function urlWhatsApp(mensagem: string): string {
  return `https://wa.me/${WHATSAPP_PEDIDOS}?text=${encodeURIComponent(mensagem)}`;
}

type Formulario = {
  nome: string;
  telefone: string;
  email: string;
  modalidade: Modalidade;
  cep: string;
  endereco: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  referencia: string;
  formaPagamento: PagamentoCheckout;
  trocoPara: string;
  observacoes: string;
};

function montarMensagemPedido({
  numero,
  itens,
  form,
  resultado,
}: {
  numero: number;
  itens: ItemCarrinho[];
  form: Formulario;
  resultado: ResultadoPedido;
}): string {
  const produtos = itens
    .map((item) => {
      const linha = `${item.quantidade}x ${item.nome} — ${moedaBRL(totalItem(item))}`;
      const adicionais = item.adicionais.length
        ? `\n   Adicionais: ${item.adicionais.map((a) => `${a.nome} (+${moedaBRL(a.preco)})`).join(", ")}`
        : "";
      const escolhas = item.comboEscolhas?.length ? `\n   Escolhas: ${item.comboEscolhas.join(", ")}` : "";
      const observacao = item.observacao ? `\n   Observação: ${item.observacao}` : "";
      return `${linha}${adicionais}${escolhas}${observacao}`;
    })
    .join("\n");

  const endereco =
    form.modalidade === "delivery"
      ? [
          `Endereço: ${form.endereco}`,
          `Bairro: ${form.bairro}`,
          `Número: ${form.numero}`,
          `Cidade: ${form.cidade}`,
          `Complemento: ${form.complemento || "-"}`,
          `Referência: ${form.referencia || "-"}`,
        ].join("\n")
      : "Endereço: Retirada no estabelecimento";

  const troco =
    form.formaPagamento === "dinheiro" && form.trocoPara
      ? ` (troco para ${moedaBRL(Number(form.trocoPara.replace(",", ".")))})`
      : "";
  const pagamento = `${PAGAMENTO_LABEL[form.formaPagamento]}${troco}`;
  const notaPix = form.formaPagamento === "pix" ? "\n\nPagamento PIX: anexarei o comprovante nesta conversa." : "";
  const observacoes = form.observacoes.trim() ? `\n\nObservações gerais:\n${form.observacoes.trim()}` : "";
  const desconto = resultado.desconto > 0 ? `Desconto: - ${moedaBRL(resultado.desconto)}\n` : "";

  return `NOVO PEDIDO
Pedido: #${numero}

Nome do cliente: ${form.nome}
Telefone: ${form.telefone}

${endereco}

PRODUTOS:
${produtos}${observacoes}

Subtotal: ${moedaBRL(resultado.subtotal)}
Taxa de entrega: ${moedaBRL(resultado.taxa_entrega)}
${desconto}Total: ${moedaBRL(resultado.total)}

Forma de pagamento: ${pagamento}
Modalidade: ${form.modalidade === "delivery" ? "Entrega" : "Retirada"}${notaPix}`;
}

function montarMensagemComprovante(form: Formulario, resultado: ResultadoPedido): string {
  return `Olá! Sou ${form.nome}. Envio o comprovante PIX do pedido #${resultado.numero} no valor de ${moedaBRL(resultado.total)}.`;
}

export function CartDrawer({
  aberto,
  aoFechar,
  config,
  itens,
  subtotal,
  alterar,
  remover,
  limpar,
  abertoLoja,
  sugestoes,
  aoAdicionarSugestao,
  aoAbrirSugestao,
}: {
  aberto: boolean;
  aoFechar: () => void;
  config: Configuracoes;
  itens: ItemCarrinho[];
  subtotal: number;
  alterar: (key: string, quantidade: number) => void;
  remover: (key: string) => void;
  limpar: () => void;
  abertoLoja: boolean;
  sugestoes: Produto[];
  aoAdicionarSugestao: (produto: Produto) => void;
  aoAbrirSugestao: (produto: Produto) => void;
}) {
  const [etapa, setEtapa] = useState<Etapa>("sacola");
  const [resultado, setResultado] = useState<ResultadoPedido | null>(null);
  const [whatsappUrl, setWhatsappUrl] = useState<string | null>(null);
  const [whatsappComprovanteUrl, setWhatsappComprovanteUrl] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [cupomCodigo, setCupomCodigo] = useState("");
  const [cupomMensagem, setCupomMensagem] = useState<{ texto: string; valido: boolean } | null>(null);
  const [desconto, setDesconto] = useState(0);
  const [subtotalCupom, setSubtotalCupom] = useState<number | null>(null);
  const [codigoAplicado, setCodigoAplicado] = useState<string | null>(null);
  const [coordenadas, setCoordenadas] = useState<Coordenadas | null>(null);
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [cepMensagem, setCepMensagem] = useState<string | null>(null);
  const ultimoCepRef = useRef("");
  const enviandoRef = useRef(false);
  const [form, setForm] = useState<Formulario>(() => ({
    nome: "",
    telefone: "",
    email: "",
    modalidade: config.aceita_delivery ? "delivery" : "retirada",
    cep: "",
    endereco: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: config.cidade ?? "",
    referencia: "",
    formaPagamento: formaInicial(config.formas_pagamento),
    trocoPara: "",
    observacoes: "",
  }));

  useEffect(() => {
    const opcoes = opcoesPagamento(config.formas_pagamento);
    setForm((atual) => ({
      ...atual,
      modalidade: config.aceita_delivery ? atual.modalidade : "retirada",
      formaPagamento: opcoes.includes(atual.formaPagamento) ? atual.formaPagamento : (opcoes[0] ?? "pix"),
      cidade: atual.cidade || config.cidade || "",
    }));
  }, [config.aceita_delivery, config.formas_pagamento, config.cidade]);

  useEffect(() => {
    if (cupomMensagem?.valido && subtotalCupom !== null && subtotal !== subtotalCupom) {
      setCupomMensagem({ texto: "O carrinho mudou. Aplique o cupom novamente.", valido: false });
      setDesconto(0);
      setSubtotalCupom(null);
      setCodigoAplicado(null);
    }
  }, [subtotal, subtotalCupom, cupomMensagem]);

  useEffect(() => {
    if (form.modalidade !== "delivery") {
      setBuscandoCep(false);
      setCepMensagem(null);
      return;
    }
    const digitos = somenteDigitos(form.cep);
    if (digitos.length !== 8 || digitos === ultimoCepRef.current) {
      setBuscandoCep(false);
      return;
    }

    let cancelado = false;
    setBuscandoCep(true);
    setCepMensagem(null);
    const timer = window.setTimeout(async () => {
      try {
        const cep = await buscarCep(digitos);
        if (cancelado) return;
        if (!cep) {
          setCepMensagem("CEP não encontrado. Confira o número ou preencha manualmente.");
          return;
        }
        ultimoCepRef.current = digitos;
        setForm((atual) => ({
          ...atual,
          endereco: cep.endereco || atual.endereco,
          bairro: cep.bairro || atual.bairro,
          cidade: cep.cidade || atual.cidade,
        }));
        setCepMensagem("Endereço preenchido pelo CEP. Confira o número e ajuste o pino no mapa.");
        const coordenadasCep = await buscarCoordenadasEndereco(
          [cep.endereco, cep.bairro, cep.cidade, cep.estado].filter(Boolean).join(", "),
        );
        if (!cancelado && coordenadasCep) setCoordenadas(coordenadasCep);
      } catch {
        if (!cancelado) setCepMensagem("Não foi possível consultar o CEP agora. Preencha manualmente.");
      } finally {
        if (!cancelado) setBuscandoCep(false);
      }
    }, 450);

    return () => {
      cancelado = true;
      window.clearTimeout(timer);
    };
  }, [form.cep, form.modalidade]);

  const aplicarEnderecoDoMapa = (ponto: Coordenadas, endereco?: EnderecoGeocodificado) => {
    setCoordenadas(ponto);
    if (!endereco) return;
    setForm((atual) => ({
      ...atual,
      cep: endereco.cep ? formatarCep(endereco.cep) : atual.cep,
      endereco: endereco.endereco || atual.endereco,
      numero: endereco.numero || atual.numero,
      bairro: endereco.bairro || atual.bairro,
      cidade: endereco.cidade || atual.cidade,
    }));
    if (endereco.cep) ultimoCepRef.current = somenteDigitos(endereco.cep);
    if (endereco.rotulo) setCepMensagem(`Local selecionado: ${endereco.rotulo}`);
  };

  const taxa = useMemo(() => {
    if (form.modalidade !== "delivery") return 0;
    if (config.frete_gratis_acima_de !== null && subtotal >= config.frete_gratis_acima_de) return 0;
    return config.taxa_entrega;
  }, [form.modalidade, subtotal, config]);

  const total = Math.max(0, Math.round((subtotal + taxa - desconto) * 100) / 100);
  const minimoOk = subtotal >= config.pedido_minimo;
  const podePedir = abertoLoja && config.aceitando_pedidos;
  const formas = opcoesPagamento(config.formas_pagamento);

  const set = <K extends keyof Formulario>(campo: K, valor: Formulario[K]) => {
    setForm((atual) => ({ ...atual, [campo]: valor }));
  };

  const aplicarCupom = async () => {
    setCupomMensagem(null);
    if (!cupomCodigo.trim()) {
      setCupomMensagem({ texto: "Digite o código do cupom.", valido: false });
      return;
    }
    try {
      const resposta = await validarCupom(cupomCodigo, subtotal);
      setCupomMensagem({ texto: resposta.mensagem, valido: resposta.valido });
      setDesconto(resposta.valido ? resposta.desconto : 0);
      setSubtotalCupom(resposta.valido ? subtotal : null);
      setCodigoAplicado(resposta.valido ? cupomCodigo.trim().toUpperCase() : null);
    } catch (erroCupom) {
      setCupomMensagem({ texto: erroCupom instanceof Error ? erroCupom.message : "Cupom inválido.", valido: false });
      setDesconto(0);
      setSubtotalCupom(null);
      setCodigoAplicado(null);
    }
  };

  const atualizarCodigoCupom = (valor: string) => {
    const codigo = valor.toUpperCase();
    setCupomCodigo(codigo);
    if (codigoAplicado && codigo.trim() !== codigoAplicado) {
      setCupomMensagem(null);
      setDesconto(0);
      setSubtotalCupom(null);
      setCodigoAplicado(null);
    }
  };

  const finalizar = async () => {
    setErro(null);
    if (!podePedir) {
      setErro("Os pedidos estão pausados ou a loja está fechada.");
      return;
    }
    if (!minimoOk) {
      setErro(`O pedido mínimo é de ${moedaBRL(config.pedido_minimo)}.`);
      return;
    }
    if (form.nome.trim().length < 2) {
      setErro("Informe seu nome.");
      return;
    }
    if (somenteDigitos(form.telefone).length < 8) {
      setErro("Informe um telefone válido com DDD.");
      return;
    }
    if (form.modalidade === "delivery" && (!form.endereco.trim() || !form.numero.trim() || !form.bairro.trim() || !form.cidade.trim())) {
      setErro("Preencha o endereço completo para entrega.");
      return;
    }
    if (!formas.includes(form.formaPagamento)) {
      setErro("Escolha uma forma de pagamento disponível.");
      return;
    }
    const troco = form.formaPagamento === "dinheiro" && form.trocoPara ? Number(form.trocoPara.replace(",", ".")) : null;
    if (troco !== null && (!Number.isFinite(troco) || troco < total)) {
      setErro("O valor para troco deve ser maior ou igual ao total.");
      return;
    }

    if (enviandoRef.current) return;
    enviandoRef.current = true;
    setWhatsappUrl(null);
    setWhatsappComprovanteUrl(null);

    let janelaWhatsApp: Window | null = null;
    try {
      janelaWhatsApp = window.open("about:blank", "_blank");
      if (janelaWhatsApp) janelaWhatsApp.opener = null;
    } catch {
      janelaWhatsApp = null;
    }

    setEnviando(true);
    try {
      const resposta = await fazerPedido({
        clienteNome: form.nome,
        clienteTelefone: form.telefone,
        clienteEmail: form.email || undefined,
        modalidade: form.modalidade,
        endereco:
          form.modalidade === "delivery"
              ? {
                cep: form.cep || null,
                endereco: form.endereco,
                numero: form.numero,
                complemento: form.complemento || null,
                bairro: form.bairro,
                cidade: form.cidade,
                referencia: form.referencia || null,
                latitude: coordenadas?.latitude ?? null,
                longitude: coordenadas?.longitude ?? null,
              }
            : null,
        itens: paraPayload(itens),
        formaPagamento: formaParaApi(form.formaPagamento),
        trocoPara: troco,
        observacoes: form.observacoes,
        cupom: desconto > 0 && codigoAplicado ? codigoAplicado : undefined,
      });

      const mensagem = montarMensagemPedido({ numero: resposta.numero, itens, form, resultado: resposta });
      const url = urlWhatsApp(mensagem);
      const comprovanteUrl = urlWhatsApp(montarMensagemComprovante(form, resposta));
      setWhatsappUrl(url);
      setWhatsappComprovanteUrl(comprovanteUrl);
      setResultado(resposta);
      salvarUltimoPedido({
        id: resposta.pedido_id,
        token: resposta.tracking_token,
        numero: resposta.numero,
        criadoEm: new Date().toISOString(),
      });
      limpar();
      setDesconto(0);
      setCupomCodigo("");
      setCupomMensagem(null);
      setSubtotalCupom(null);
      setCodigoAplicado(null);
      setEtapa("sucesso");
      toast.success("Pedido enviado com sucesso!");

      try {
        if (janelaWhatsApp && !janelaWhatsApp.closed) {
          janelaWhatsApp.location.replace(url);
        } else {
          window.open(url, "_blank", "noopener,noreferrer");
        }
      } catch {
        toast.info("Use o botão de WhatsApp para enviar o pedido.");
      }
    } catch (erroPedido) {
      janelaWhatsApp?.close();
      setErro(erroPedido instanceof Error ? erroPedido.message : "Não foi possível enviar o pedido.");
    } finally {
      enviandoRef.current = false;
      setEnviando(false);
    }
  };

  const fechar = () => {
    aoFechar();
    if (etapa === "sucesso") {
      setResultado(null);
      setWhatsappUrl(null);
      setWhatsappComprovanteUrl(null);
    }
    setEtapa("sacola");
  };

  const titulo = etapa === "sucesso" ? "Pedido confirmado" : etapa === "dados" ? "Finalizar pedido" : "Sua sacola";

  return (
    <Drawer aberto={aberto} aoFechar={fechar} titulo={titulo} largura="sm:max-w-lg" conteudoRolavel={false} className="theme-cinema">
      <div className="flex min-h-0 flex-col sm:h-full">
        {etapa === "sacola" ? (
          <>
            {itens.length === 0 ? (
              <div className="flex-1 overflow-y-auto p-5 max-sm:max-h-[52vh] max-sm:flex-none">
                <EstadoVazio
                  titulo="Sua sacola está vazia"
                  descricao="Escolha um item do cardápio para começar."
                  icone={<ShoppingBag className="h-6 w-6" />}
                />
              </div>
            ) : (
              <>
                <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-5 max-sm:max-h-[52vh] max-sm:flex-none">
                  {itens.map((item) => (
                    <div key={item.key} className="flex gap-3 rounded-xl border border-border p-3">
                      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-secondary">
                        {item.imagemUrl ? (
                          <img src={item.imagemUrl} alt={item.nome} className="h-full w-full object-cover" />
                        ) : (
                          <div className="grid h-full w-full place-items-center font-display text-2xl">{item.nome.slice(0, 1)}</div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{item.nome}</p>
                            {item.comboEscolhas?.length ? (
                              <p className="mt-0.5 line-clamp-3 text-[11px] text-muted-foreground">
                                Inclui: {item.comboEscolhas.join(" • ")}
                              </p>
                            ) : null}
                            {item.adicionais.length ? (
                              <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">
                                {item.adicionais.map((a) => a.nome).join(" • ")}
                              </p>
                            ) : null}
                            {item.observacao ? (
                              <p className="mt-0.5 line-clamp-1 text-[11px] italic text-muted-foreground">“{item.observacao}”</p>
                            ) : null}
                          </div>
                          <button
                            type="button"
                            onClick={() => remover(item.key)}
                            aria-label={`Remover ${item.nome}`}
                            className="text-muted-foreground transition hover:text-danger"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <div className="inline-flex h-8 items-center rounded-full border border-border">
                            <button type="button" onClick={() => alterar(item.key, item.quantidade - 1)} className="grid h-8 w-8 place-items-center" aria-label="Diminuir">
                              −
                            </button>
                            <span className="min-w-6 text-center text-xs">{item.quantidade}</span>
                            <button type="button" onClick={() => alterar(item.key, item.quantidade + 1)} className="grid h-8 w-8 place-items-center" aria-label="Aumentar">
                              +
                            </button>
                          </div>
                          <span className="text-sm font-semibold">{moedaBRL(totalItem(item))}</span>
                        </div>
                      </div>
                    </div>
                  ))}

                  {sugestoes.length ? (
                    <div className="pt-1">
                      <div className="flex items-end justify-between gap-2">
                        <p className="text-sm font-semibold">Adicione mais</p>
                        <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Lanches e bebidas</span>
                      </div>
                      <div className="hide-scrollbar -mx-1 mt-2 flex gap-2 overflow-x-auto px-1 pb-1">
                        {sugestoes.map((produto) => (
                          <div key={produto.id} className="w-36 shrink-0 overflow-hidden rounded-xl border border-border bg-card">
                            <button
                              type="button"
                              onClick={() => {
                                aoFechar();
                                aoAbrirSugestao(produto);
                              }}
                              className="block w-full text-left"
                              aria-label={`Ver ${produto.nome}`}
                            >
                              <div className="aspect-[4/3] overflow-hidden bg-secondary">
                                <ImagemProduto url={produto.imagem_url} nome={produto.nome} />
                              </div>
                              <p className="line-clamp-2 px-2 pt-1.5 text-[11px] font-medium leading-tight">{produto.nome}</p>
                            </button>
                            <div className="flex items-center justify-between gap-1 px-2 pb-2 pt-1">
                              <span className="text-xs font-semibold text-primary">{moedaBRL(precoVigente(produto))}</span>
                              <button
                                type="button"
                                onClick={() => aoAdicionarSugestao(produto)}
                                disabled={!produto.disponivel}
                                aria-label={`Adicionar ${produto.nome}`}
                                className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition active:scale-95 disabled:opacity-40"
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="rounded-xl border border-border bg-secondary/30 p-3.5">
                    <p className="flex items-center gap-2 text-sm font-medium">
                      <Ticket className="h-4 w-4" /> Cupom de desconto
                    </p>
                    <div className="mt-2 flex gap-2">
                      <input
                        value={cupomCodigo}
                        onChange={(event) => atualizarCodigoCupom(event.target.value)}
                        placeholder="Digite o cupom"
                        className="h-10 min-w-0 flex-1 rounded-lg border border-input bg-card px-3 text-sm uppercase focus:border-primary focus:outline-none"
                      />
                      <Button type="button" variant="outline" size="sm" onClick={aplicarCupom}>
                        Aplicar
                      </Button>
                    </div>
                    {cupomMensagem ? (
                      <p className={cn("mt-2 text-xs", cupomMensagem.valido ? "text-success" : "text-danger")}>{cupomMensagem.texto}</p>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    onClick={limpar}
                    className="text-xs text-muted-foreground underline decoration-current/30 underline-offset-4 hover:text-danger"
                  >
                    Limpar sacola
                  </button>
                </div>

                <div className="shrink-0 border-t border-border bg-card p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
                  {!podePedir ? (
                    <p className="mb-3 rounded-lg bg-accent/15 px-3 py-2 text-xs text-foreground">
                      A loja está fechada ou os pedidos estão pausados. Você pode voltar mais tarde.
                    </p>
                  ) : null}
                  {!minimoOk ? (
                    <p className="mb-3 text-xs text-danger">
                      Faltam {moedaBRL(config.pedido_minimo - subtotal)} para o pedido mínimo de {moedaBRL(config.pedido_minimo)}.
                    </p>
                  ) : null}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-semibold">{moedaBRL(subtotal)}</span>
                  </div>
                  {desconto > 0 ? (
                    <div className="mt-1 flex items-center justify-between text-sm text-success">
                      <span>Desconto</span>
                      <span>− {moedaBRL(desconto)}</span>
                    </div>
                  ) : null}
                  <Button
                    className="mt-3 w-full"
                    size="lg"
                    disabled={!itens.length || !minimoOk || !podePedir}
                    onClick={() => setEtapa("dados")}
                  >
                    Continuar
                  </Button>
                </div>
              </>
            )}
          </>
        ) : null}

        {etapa === "dados" ? (
          <div className="flex min-h-0 flex-col sm:flex-1">
            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5 max-sm:max-h-[58vh] max-sm:flex-none">
              <button type="button" onClick={() => setEtapa("sacola")} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-3.5 w-3.5" /> Voltar para a sacola
              </button>

              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Seu nome" obrigatorio value={form.nome} onChange={(e) => set("nome", e.target.value)} autoComplete="name" />
                <Input
                  label="Telefone / WhatsApp"
                  obrigatorio
                  value={form.telefone}
                  onChange={(e) => set("telefone", formatarTelefone(e.target.value))}
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="(71) 99999-9999"
                />
              </div>
              <Input label="E-mail (opcional)" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} autoComplete="email" />

              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">Como você quer receber?</p>
                <div className="grid grid-cols-2 gap-2">
                  {config.aceita_delivery ? (
                    <button
                      type="button"
                      onClick={() => set("modalidade", "delivery")}
                      className={cn(
                        "flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm transition",
                        form.modalidade === "delivery" ? "border-primary bg-primary/5" : "border-border",
                      )}
                    >
                      <Truck className="h-4 w-4" /> {MODALIDADE_LABEL.delivery}
                    </button>
                  ) : null}
                  {config.aceita_retirada ? (
                    <button
                      type="button"
                      onClick={() => set("modalidade", "retirada")}
                      className={cn(
                        "flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm transition",
                        form.modalidade === "retirada" ? "border-primary bg-primary/5" : "border-border",
                      )}
                    >
                      <Store className="h-4 w-4" /> {MODALIDADE_LABEL.retirada}
                    </button>
                  ) : null}
                </div>
              </div>

              {form.modalidade === "delivery" ? (
                <div className="space-y-4 rounded-xl border border-border p-3.5">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    <MapPin className="h-4 w-4" /> Endereço de entrega
                  </p>
                  <div className="grid gap-4 sm:grid-cols-[1fr_2fr]">
                    <Input
                      label="CEP"
                      value={form.cep}
                      onChange={(event) => set("cep", formatarCep(event.target.value))}
                      inputMode="numeric"
                      autoComplete="postal-code"
                      placeholder="00000-000"
                    />
                    <Input label="Rua / avenida" obrigatorio value={form.endereco} onChange={(e) => set("endereco", e.target.value)} autoComplete="address-line1" />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <Input label="Número" obrigatorio value={form.numero} onChange={(e) => set("numero", e.target.value)} />
                    <Input label="Bairro" obrigatorio value={form.bairro} onChange={(e) => set("bairro", e.target.value)} className="sm:col-span-2" />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input label="Cidade" obrigatorio value={form.cidade} onChange={(e) => set("cidade", e.target.value)} />
                    <Input label="Complemento" value={form.complemento} onChange={(e) => set("complemento", e.target.value)} placeholder="Apto, bloco…" />
                  </div>
                  <Input label="Ponto de referência" value={form.referencia} onChange={(e) => set("referencia", e.target.value)} />
                  {buscandoCep ? (
                    <p className="flex items-center gap-2 text-xs text-muted-foreground">
                      <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> Buscando CEP…
                    </p>
                  ) : cepMensagem ? (
                    <p className="text-xs text-muted-foreground">{cepMensagem}</p>
                  ) : null}
                  <MapaEndereco coordenadas={coordenadas} aoMudar={aplicarEnderecoDoMapa} />
                </div>
              ) : (
                <div className="rounded-xl border border-border bg-secondary/30 p-3.5 text-sm">
                  <p className="font-medium">Retirada no local</p>
                  <p className="mt-1 text-muted-foreground">
                    {[config.endereco, config.bairro, config.cidade].filter(Boolean).join(", ") || "Endereço informado no cardápio."}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">Tempo estimado: {config.tempo_retirada_min} min.</p>
                  <p className="mt-2 text-xs font-medium text-gold">Você deverá buscar o pedido no estabelecimento.</p>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <Select
                  label="Forma de pagamento"
                  obrigatorio
                  value={form.formaPagamento}
                  onChange={(e) => set("formaPagamento", e.target.value as PagamentoCheckout)}
                >
                  {formas.map((forma) => (
                    <option key={forma} value={forma}>
                      {PAGAMENTO_LABEL[forma]}
                    </option>
                  ))}
                </Select>
                {form.formaPagamento === "dinheiro" ? (
                  <Input
                    label="Troco para"
                    value={form.trocoPara}
                    onChange={(e) => set("trocoPara", e.target.value)}
                    inputMode="decimal"
                    placeholder="Ex.: 100,00"
                    hint="Deixe vazio se não precisar de troco."
                  />
                ) : null}
              </div>

              {form.formaPagamento === "pix" ? (
                <PixBox
                  total={total}
                  comprovanteUrl={urlWhatsApp(
                    `Olá! Vou enviar o comprovante PIX do meu pedido no valor de ${moedaBRL(total)}.`,
                  )}
                />
              ) : null}

              <Textarea
                label="Observações do pedido"
                value={form.observacoes}
                onChange={(e) => set("observacoes", e.target.value)}
                maxLength={1000}
                rows={3}
                placeholder="Ex.: ponto da carne, retirar talheres, campainha com defeito…"
              />

              {erro ? <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{erro}</p> : null}

              <div className="rounded-xl border border-border bg-secondary/25 p-3.5 text-sm">
                <p className="flex items-center gap-2 font-medium">
                  <MessageSquare className="h-4 w-4" /> Resumo
                </p>
                <div className="mt-2 space-y-1 text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>{moedaBRL(subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{form.modalidade === "delivery" ? "Entrega" : "Retirada"}</span>
                    <span>{taxa > 0 ? moedaBRL(taxa) : "Grátis"}</span>
                  </div>
                  {desconto > 0 ? (
                    <div className="flex justify-between text-success">
                      <span>Cupom</span>
                      <span>− {moedaBRL(desconto)}</span>
                    </div>
                  ) : null}
                  <div className="flex justify-between border-t border-border pt-2 text-base font-semibold text-foreground">
                    <span>Total</span>
                    <span className="text-primary">{moedaBRL(total)}</span>
                  </div>
                </div>
                {form.modalidade === "delivery" && config.frete_gratis_acima_de !== null ? (
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    Entrega grátis em pedidos acima de {moedaBRL(config.frete_gratis_acima_de)}.
                  </p>
                ) : null}
              </div>
            </div>

            <div className="shrink-0 border-t border-border bg-card p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
              <Button className="w-full uppercase tracking-[0.12em]" size="lg" carregando={enviando} onClick={finalizar} disabled={!podePedir}>
                {enviando ? "Enviando pedido…" : `Confirmar pedido • ${moedaBRL(total)}`}
              </Button>
              <p className="mt-2 text-center text-[11px] text-muted-foreground">
                Ao confirmar, o pedido será enviado ao estabelecimento e você poderá acompanhar pelo celular.
              </p>
            </div>
          </div>
        ) : null}

        {etapa === "sucesso" && resultado ? (
          <div className="flex min-h-0 flex-col items-center justify-center overflow-y-auto p-6 text-center sm:flex-1">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-success/10 text-success">
              <CheckCircle2 className="h-9 w-9" />
            </div>
            <p className="eyebrow mt-5">Pedido recebido</p>
            <h3 className="mt-2 text-3xl">Número {resultado.numero}</h3>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              Obrigado! O estabelecimento já recebeu seu pedido. Acompanhe o preparo pelo link abaixo.
            </p>
            {form.modalidade === "retirada" ? (
              <p className="mt-2 max-w-sm text-xs font-medium text-gold">
                Retirada no estabelecimento: aguarde o preparo antes de buscar.
              </p>
            ) : null}
            <p className="mt-4 text-lg font-semibold">{moedaBRL(resultado.total)}</p>
            {whatsappUrl ? (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className={cn(buttonVariants({ variant: "primary", size: "lg" }), "mt-5 w-full uppercase tracking-[0.12em]")}
              >
                <MessageCircle className="h-4 w-4" /> Enviar pedido pelo WhatsApp
              </a>
            ) : null}
            {form.formaPagamento === "pix" ? (
              <>
                <div className="mt-4 w-full max-w-md rounded-xl border border-gold/30 bg-gold/10 px-4 py-3 text-left text-xs text-white/65">
                  <p className="font-semibold text-gold">PIX: falta enviar o comprovante.</p>
                  <p className="mt-1">
                    Faça o PIX com a chave abaixo e envie o comprovante para a loja pelo WhatsApp.
                    O pedido está registrado e o pagamento será confirmado pelo estabelecimento.
                  </p>
                </div>
                <PixBox
                  total={resultado.total}
                  numero={resultado.numero}
                  comprovanteUrl={whatsappComprovanteUrl}
                  className="mt-3 w-full max-w-md text-left"
                />
              </>
            ) : null}
            <Link
              to="/pedido"
              search={{ id: resultado.pedido_id, token: resultado.tracking_token }}
              onClick={fechar}
              className="mt-4 w-full"
            >
              <Button className="w-full" variant="outline" size="lg">
                Acompanhar pedido
              </Button>
            </Link>
            <button type="button" onClick={fechar} className="mt-3 text-sm text-muted-foreground underline underline-offset-4">
              Continuar no cardápio
            </button>
          </div>
        ) : null}
      </div>
    </Drawer>
  );
}

function PixBox({
  total,
  numero,
  comprovanteUrl,
  className,
}: {
  total: number;
  numero?: number;
  comprovanteUrl?: string | null;
  className?: string;
}) {
  const [copiado, setCopiado] = useState(false);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(PIX_RECEBEDOR.chave);
    } catch {
      const campo = document.createElement("textarea");
      campo.value = PIX_RECEBEDOR.chave;
      campo.style.position = "fixed";
      campo.style.opacity = "0";
      document.body.appendChild(campo);
      campo.select();
      document.execCommand("copy");
      campo.remove();
    }
    setCopiado(true);
    toast.success("Chave PIX copiada.");
    window.setTimeout(() => setCopiado(false), 2200);
  };

  return (
    <div className={cn("rounded-2xl border border-gold/25 bg-gold/[0.06] p-4", className)}>
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gold/15 text-gold">
          <QrCode className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gold">Pagamento via PIX</p>
          <p className="mt-1 text-sm font-medium text-white">{PIX_RECEBEDOR.nome}</p>
          <p className="mt-0.5 text-[11px] text-white/50">
            Chave {PIX_RECEBEDOR.tipo}: <span className="font-semibold text-white">{PIX_RECEBEDOR.chave}</span>
          </p>
        </div>
        <span className="shrink-0 text-sm font-semibold text-primary">{moedaBRL(total)}</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void copiar()}
          className="border-gold/30 text-gold hover:bg-gold/10"
        >
          <Copy className="h-3.5 w-3.5" /> {copiado ? "Chave copiada" : "Copiar chave"}
        </Button>
        {comprovanteUrl ? (
          <a
            href={comprovanteUrl}
            target="_blank"
            rel="noreferrer"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "border-white/10 text-white/70 hover:bg-white/10")}
          >
            <MessageCircle className="h-3.5 w-3.5" /> Enviar comprovante
          </a>
        ) : null}
      </div>
      <div className="mt-3 space-y-1 text-[11px] leading-relaxed text-white/55">
        <p><span className="font-semibold text-gold">1.</span> Faça o PIX usando a chave acima.</p>
        <p><span className="font-semibold text-gold">2.</span> {numero ? "Pedido confirmado." : "Confirme o pedido."}</p>
        <p><span className="font-semibold text-gold">3.</span> Envie o comprovante para a loja pelo WhatsApp.</p>
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-white/40">
        O pagamento permanece pendente até a loja confirmar o comprovante.
      </p>
      {numero ? <p className="mt-1 text-[11px] text-white/40">Pedido #{numero}.</p> : null}
    </div>
  );
}

function totalItem(item: ItemCarrinho): number {
  return (item.precoBase + item.adicionais.reduce((soma, a) => soma + a.preco, 0)) * item.quantidade;
}


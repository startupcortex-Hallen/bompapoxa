import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  CheckCircle2,
  MapPin,
  MessageSquare,
  ShoppingBag,
  Store,
  Ticket,
  Trash2,
  Truck,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/modal";
import { Input, Select, Textarea } from "@/components/ui/form";
import { EstadoVazio } from "@/components/ui/feedback";
import { fazerPedido, validarCupom } from "@/lib/api";
import { formatarTelefone, moedaBRL, somenteDigitos } from "@/lib/format";
import { FORMA_PAGAMENTO_LABEL, MODALIDADE_LABEL } from "@/lib/order-status";
import type { FormaPagamento, Modalidade, ResultadoPedido } from "@/lib/types";
import type { Configuracoes } from "@/lib/types";
import { paraPayload, type ItemCarrinho } from "@/lib/cart";
import { salvarUltimoPedido } from "@/hooks/use-cart";
import { cn } from "@/lib/utils";

type Etapa = "sacola" | "dados" | "sucesso";

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
  formaPagamento: FormaPagamento;
  trocoPara: string;
  observacoes: string;
};

function formaInicial(formas: string[]): FormaPagamento {
  const disponivel = formas[0];
  return disponivel === "dinheiro" || disponivel === "cartao" ? disponivel : "pix";
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
}) {
  const [etapa, setEtapa] = useState<Etapa>("sacola");
  const [resultado, setResultado] = useState<ResultadoPedido | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [cupomCodigo, setCupomCodigo] = useState("");
  const [cupomMensagem, setCupomMensagem] = useState<{ texto: string; valido: boolean } | null>(null);
  const [desconto, setDesconto] = useState(0);
  const [subtotalCupom, setSubtotalCupom] = useState<number | null>(null);
  const [codigoAplicado, setCodigoAplicado] = useState<string | null>(null);
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
    setForm((atual) => ({
      ...atual,
      modalidade: config.aceita_delivery ? atual.modalidade : "retirada",
      formaPagamento: config.formas_pagamento.includes(atual.formaPagamento)
        ? atual.formaPagamento
        : formaInicial(config.formas_pagamento),
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

  const taxa = useMemo(() => {
    if (form.modalidade !== "delivery") return 0;
    if (config.frete_gratis_acima_de !== null && subtotal >= config.frete_gratis_acima_de) return 0;
    return config.taxa_entrega;
  }, [form.modalidade, subtotal, config]);

  const total = Math.max(0, Math.round((subtotal + taxa - desconto) * 100) / 100);
  const minimoOk = subtotal >= config.pedido_minimo;
  const podePedir = abertoLoja && config.aceitando_pedidos;
  const formas = config.formas_pagamento.filter(
    (forma): forma is FormaPagamento => forma === "pix" || forma === "dinheiro" || forma === "cartao",
  );

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
              }
            : null,
        itens: paraPayload(itens),
        formaPagamento: form.formaPagamento,
        trocoPara: troco,
        observacoes: form.observacoes,
        cupom: desconto > 0 && codigoAplicado ? codigoAplicado : undefined,
      });
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
    } catch (erroPedido) {
      setErro(erroPedido instanceof Error ? erroPedido.message : "Não foi possível enviar o pedido.");
    } finally {
      setEnviando(false);
    }
  };

  const fechar = () => {
    aoFechar();
    if (etapa === "sucesso") setResultado(null);
    setEtapa("sacola");
  };

  const titulo = etapa === "sucesso" ? "Pedido confirmado" : etapa === "dados" ? "Finalizar pedido" : "Sua sacola";

  return (
    <Drawer aberto={aberto} aoFechar={fechar} titulo={titulo} largura="sm:max-w-lg">
      <div className="flex min-h-full flex-col">
        {etapa === "sacola" ? (
          <>
            {itens.length === 0 ? (
              <div className="p-5">
                <EstadoVazio
                  titulo="Sua sacola está vazia"
                  descricao="Escolha um item do cardápio para começar."
                  icone={<ShoppingBag className="h-6 w-6" />}
                />
              </div>
            ) : (
              <>
                <div className="flex-1 space-y-3 p-5">
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

                <div className="safe-bottom sticky bottom-0 border-t border-border bg-card p-5">
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
          <div className="flex flex-1 flex-col">
            <div className="flex-1 space-y-5 p-5">
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
                    <Input label="CEP" value={form.cep} onChange={(e) => set("cep", e.target.value)} inputMode="numeric" autoComplete="postal-code" />
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
                </div>
              ) : (
                <div className="rounded-xl border border-border bg-secondary/30 p-3.5 text-sm">
                  <p className="font-medium">Retirada no local</p>
                  <p className="mt-1 text-muted-foreground">
                    {[config.endereco, config.bairro, config.cidade].filter(Boolean).join(", ") || "Endereço informado no cardápio."}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">Tempo estimado: {config.tempo_retirada_min} min.</p>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <Select label="Forma de pagamento" obrigatorio value={form.formaPagamento} onChange={(e) => set("formaPagamento", e.target.value as FormaPagamento)}>
                  {formas.map((forma) => (
                    <option key={forma} value={forma}>
                      {FORMA_PAGAMENTO_LABEL[forma]}
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
                    <span>{moedaBRL(total)}</span>
                  </div>
                </div>
                {form.modalidade === "delivery" && config.frete_gratis_acima_de !== null ? (
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    Entrega grátis em pedidos acima de {moedaBRL(config.frete_gratis_acima_de)}.
                  </p>
                ) : null}
              </div>
            </div>

            <div className="safe-bottom sticky bottom-0 border-t border-border bg-card p-5">
              <Button className="w-full" size="lg" carregando={enviando} onClick={finalizar} disabled={!podePedir}>
                {enviando ? "Enviando pedido…" : `Confirmar pedido • ${moedaBRL(total)}`}
              </Button>
              <p className="mt-2 text-center text-[11px] text-muted-foreground">
                Ao confirmar, o pedido será enviado ao estabelecimento e você poderá acompanhar pelo celular.
              </p>
            </div>
          </div>
        ) : null}

        {etapa === "sucesso" && resultado ? (
          <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-success/10 text-success">
              <CheckCircle2 className="h-9 w-9" />
            </div>
            <p className="eyebrow mt-5">Pedido recebido</p>
            <h3 className="mt-2 text-3xl">Número {resultado.numero}</h3>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              Obrigado! O estabelecimento já recebeu seu pedido. Acompanhe o preparo pelo link abaixo.
            </p>
            <p className="mt-4 text-lg font-semibold">{moedaBRL(resultado.total)}</p>
            <Link
              to="/pedido"
              search={{ id: resultado.pedido_id, token: resultado.tracking_token }}
              onClick={fechar}
              className="mt-6 w-full"
            >
              <Button className="w-full" size="lg">
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

function totalItem(item: ItemCarrinho): number {
  return (item.precoBase + item.adicionais.reduce((soma, a) => soma + a.preco, 0)) * item.quantidade;
}


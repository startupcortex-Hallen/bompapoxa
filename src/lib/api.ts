import { supabase } from "@/integrations/supabase/client";
import { removerImagens } from "./image-upload";
import { mensagemErro } from "./auth";
import { numero } from "./format";
import { mapAdicional, mapBanner, mapCategoria, mapConfig, mapCupom, mapHorario, mapProduto } from "./mappers";
import type {
  Adicional,
  Avaliacao,
  Banner,
  Categoria,
  Combo,
  Configuracoes,
  Cupom,
  EnderecoPedido,
  HistoricoPedido,
  Horario,
  ItemAdicional,
  ItemPedido,
  Modalidade,
  Pedido,
  Produto,
  ResultadoPedido,
  StatusPagamento,
  StatusPedido,
  StatusPedidoRastreio,
} from "./types";

type Row = Record<string, unknown>;

function falhar(erro: { message?: string; code?: string; details?: string } | null): void {
  if (!erro) return;
  const codigo = erro.code ?? "";
  if (codigo === "23505") throw new Error("Já existe um registro com esse código ou nome.");
  if (codigo === "23503") throw new Error("Este registro está em uso e não pode ser excluído.");
  if (codigo === "23514") throw new Error("Confira os dados informados. Algum valor não é permitido.");
  if (codigo === "42501" || erro.message?.includes("row-level security")) {
    throw new Error("Seu usuário não tem permissão para esta operação.");
  }
  if (codigo === "PGRST116") throw new Error("Registro não encontrado.");
  throw new Error(mensagemErro(erro));
}

function primeiro<T>(data: unknown): T | null {
  if (Array.isArray(data)) return (data[0] as T) ?? null;
  if (data && typeof data === "object") return data as T;
  return null;
}

function mapRastreio(valor: unknown): StatusPedidoRastreio | null {
  if (!valor || typeof valor !== "object") return null;
  const row = valor as Row;
  const endereco = (row.endereco && typeof row.endereco === "object" ? row.endereco : {}) as Row;
  const itens = Array.isArray(row.itens)
    ? (row.itens as Row[]).map((item): ItemPedido => ({
        id: String(item.id ?? ""),
        pedido_id: String(row.id ?? ""),
        produto_id: (item.produto_id as string | null) ?? null,
        combo_id: (item.combo_id as string | null) ?? null,
        nome: String(item.nome ?? ""),
        preco_unitario: numero(item.preco_unitario),
        quantidade: numero(item.quantidade),
        adicionais: Array.isArray(item.adicionais)
          ? (item.adicionais as Row[]).map((a): ItemAdicional => ({
              id: String(a.id ?? ""),
              nome: String(a.nome ?? ""),
              preco: numero(a.preco),
            }))
          : [],
        observacao: (item.observacao as string | null) ?? null,
        created_at: String(item.created_at ?? ""),
      }))
    : [];
  const historico = Array.isArray(row.historico)
    ? (row.historico as Row[]).map((h): HistoricoPedido => ({
        id: String(h.id ?? ""),
        pedido_id: String(row.id ?? ""),
        status_anterior: (h.status_anterior as StatusPedido | null) ?? null,
        status_novo: (h.status_novo as StatusPedido) ?? "novo",
        observacao: (h.observacao as string | null) ?? null,
        created_at: String(h.created_at ?? ""),
      }))
    : [];
  const avaliacao = row.avaliacao && typeof row.avaliacao === "object" ? (row.avaliacao as StatusPedidoRastreio["avaliacao"]) : null;
  return {
    id: String(row.id ?? ""),
    numero: numero(row.numero),
    cliente_nome: String(row.cliente_nome ?? ""),
    cliente_telefone: String(row.cliente_telefone ?? ""),
    cliente_email: (row.cliente_email as string | null) ?? null,
    modalidade: (row.modalidade as Modalidade) ?? "delivery",
    cep: (endereco.cep as string | null) ?? null,
    endereco: (endereco.endereco as string | null) ?? null,
    numero_endereco: (endereco.numero as string | null) ?? null,
    complemento: (endereco.complemento as string | null) ?? null,
    bairro: (endereco.bairro as string | null) ?? null,
    cidade: (endereco.cidade as string | null) ?? null,
    referencia: (endereco.referencia as string | null) ?? null,
    forma_pagamento: (row.forma_pagamento as Pedido["forma_pagamento"]) ?? "pix",
    troco_para: row.troco_para == null ? null : numero(row.troco_para),
    status: (row.status as StatusPedido) ?? "novo",
    status_pagamento: (row.status_pagamento as StatusPagamento) ?? "pendente",
    subtotal: numero(row.subtotal),
    taxa_entrega: numero(row.taxa_entrega),
    desconto: numero(row.desconto),
    total: numero(row.total),
    cupom_codigo: (row.cupom_codigo as string | null) ?? null,
    observacoes: (row.observacoes as string | null) ?? null,
    created_at: String(row.criado_em ?? ""),
    updated_at: String(row.atualizado_em ?? ""),
    itens,
    historico,
    avaliacao,
  };
}

export async function fazerPedido(entrada: {
  clienteNome: string;
  clienteTelefone: string;
  clienteEmail?: string;
  modalidade: Modalidade;
  endereco?: EnderecoPedido | null;
  itens: { produto_id?: string; combo_id?: string; quantidade: number; adicionais: string[]; observacao?: string }[];
  formaPagamento: "pix" | "dinheiro" | "cartao";
  trocoPara?: number | null;
  observacoes?: string;
  cupom?: string;
}): Promise<ResultadoPedido> {
  const { data, error } = await supabase.rpc("cardapio_exemplo_place_order", {
    p_cliente_nome: entrada.clienteNome,
    p_cliente_telefone: entrada.clienteTelefone,
    p_cliente_email: entrada.clienteEmail ?? null,
    p_modalidade: entrada.modalidade,
    p_endereco: entrada.endereco ?? null,
    p_itens: entrada.itens,
    p_forma_pagamento: entrada.formaPagamento,
    p_troco_para: entrada.trocoPara ?? null,
    p_observacoes: entrada.observacoes ?? null,
    p_cupom: entrada.cupom ?? null,
  });
  if (error) falhar(error);
  const row = primeiro<Row>(data);
  if (!row) throw new Error("O pedido foi criado, mas não recebemos a confirmação. Confira com o estabelecimento.");
  return {
    pedido_id: String(row.pedido_id),
    numero: numero(row.numero),
    tracking_token: String(row.tracking_token),
    subtotal: numero(row.subtotal),
    taxa_entrega: numero(row.taxa_entrega),
    desconto: numero(row.desconto),
    total: numero(row.total),
  };
}

export async function consultarPedido(pedidoId: string, token: string): Promise<StatusPedidoRastreio | null> {
  const { data, error } = await supabase.rpc("cardapio_exemplo_get_pedido", {
    p_pedido_id: pedidoId,
    p_token: token,
  });
  if (error) falhar(error);
  return mapRastreio(data);
}

export async function validarCupom(codigo: string, subtotal: number) {
  const { data, error } = await supabase.rpc("cardapio_exemplo_validar_cupom", {
    p_codigo: codigo,
    p_subtotal: subtotal,
  });
  if (error) falhar(error);
  const row = primeiro<Row>(data);
  return {
    valido: Boolean(row?.valido),
    desconto: numero(row?.desconto),
    mensagem: String(row?.mensagem ?? "Cupom inválido."),
  };
}

export async function avaliarPedido(entrada: {
  pedidoId: string;
  token: string;
  nome: string;
  nota: number;
  comentario: string;
}): Promise<void> {
  const { error } = await supabase.rpc("cardapio_exemplo_submit_avaliacao", {
    p_pedido_id: entrada.pedidoId,
    p_token: entrada.token,
    p_nome: entrada.nome,
    p_nota: entrada.nota,
    p_comentario: entrada.comentario,
  });
  if (error) falhar(error);
}

export async function salvarCategoria(dados: Partial<Categoria> & { nome: string }): Promise<Categoria> {
  const registro = {
    nome: dados.nome.trim(),
    descricao: dados.descricao?.trim() || null,
    imagem_url: dados.imagem_url || null,
    ordem: dados.ordem ?? 0,
    ativo: dados.ativo ?? true,
    destaque: dados.destaque ?? false,
  };
  let imagemAnterior: string | null = null;
  if (dados.id) {
    const { data: anterior } = await supabase
      .from("cardapio_exemplo_categorias")
      .select("imagem_url")
      .eq("id", dados.id)
      .maybeSingle();
    imagemAnterior = (anterior as { imagem_url?: string | null } | null)?.imagem_url ?? null;
  }
  const resposta = dados.id
    ? await supabase.from("cardapio_exemplo_categorias").update(registro).eq("id", dados.id).select("*").single()
    : await supabase.from("cardapio_exemplo_categorias").insert(registro).select("*").single();
  if (resposta.error) falhar(resposta.error);
  if (imagemAnterior && imagemAnterior !== registro.imagem_url) await removerImagens([imagemAnterior]);
  return mapCategoria(resposta.data as Row);
}

export async function excluirCategoria(id: string): Promise<void> {
  const { data: anterior } = await supabase
    .from("cardapio_exemplo_categorias")
    .select("imagem_url")
    .eq("id", id)
    .maybeSingle();
  const { error } = await supabase.from("cardapio_exemplo_categorias").delete().eq("id", id);
  if (error) falhar(error);
  const imagem = (anterior as { imagem_url?: string | null } | null)?.imagem_url;
  if (imagem) await removerImagens([imagem]);
}

export async function salvarProduto(dados: Partial<Produto> & { nome: string; categoria_id: string; preco: number }): Promise<Produto> {
  const registro = {
    categoria_id: dados.categoria_id,
    nome: dados.nome.trim(),
    descricao: dados.descricao?.trim() || null,
    preco: dados.preco,
    preco_promocional: dados.preco_promocional ?? null,
    imagem_url: dados.imagem_url || null,
    galeria: dados.galeria ?? [],
    ingredientes: dados.ingredientes ?? [],
    disponivel: dados.disponivel ?? true,
    destaque: dados.destaque ?? false,
    tempo_preparo_min: dados.tempo_preparo_min ?? null,
    ordem: dados.ordem ?? 0,
    ativo: dados.ativo ?? true,
    min_adicionais: dados.min_adicionais ?? 0,
    max_adicionais: dados.max_adicionais ?? 20,
  };
  let anterior: { imagem_url: string | null; galeria: string[] | null } | null = null;
  if (dados.id) {
    const { data } = await supabase
      .from("cardapio_exemplo_produtos")
      .select("imagem_url, galeria")
      .eq("id", dados.id)
      .maybeSingle();
    anterior = (data as { imagem_url: string | null; galeria: string[] | null } | null) ?? null;
  }
  const resposta = dados.id
    ? await supabase.from("cardapio_exemplo_produtos").update(registro).eq("id", dados.id).select("*").single()
    : await supabase.from("cardapio_exemplo_produtos").insert(registro).select("*").single();
  if (resposta.error) falhar(resposta.error);
  if (anterior) {
    const novas = new Set([registro.imagem_url, ...registro.galeria].filter((url): url is string => Boolean(url)));
    const antigas = [anterior.imagem_url, ...(anterior.galeria ?? [])].filter((url): url is string => Boolean(url));
    const remover = antigas.filter((url) => !novas.has(url));
    if (remover.length) await removerImagens(remover);
  }
  return mapProduto(resposta.data as Row, []);
}

export async function atualizarProduto(id: string, patch: Partial<Produto>): Promise<void> {
  const { error } = await supabase.from("cardapio_exemplo_produtos").update(patch).eq("id", id);
  if (error) falhar(error);
}

export async function excluirProduto(id: string): Promise<void> {
  const { data: anterior } = await supabase
    .from("cardapio_exemplo_produtos")
    .select("imagem_url, galeria")
    .eq("id", id)
    .maybeSingle();
  const { error } = await supabase.from("cardapio_exemplo_produtos").delete().eq("id", id);
  if (error) falhar(error);
  const registro = anterior as { imagem_url: string | null; galeria: string[] | null } | null;
  if (registro) await removerImagens([registro.imagem_url, ...(registro.galeria ?? [])]);
}

export async function salvarAdicional(dados: Partial<Adicional> & { produto_id: string; nome: string; preco: number }): Promise<Adicional> {
  const registro = {
    produto_id: dados.produto_id,
    nome: dados.nome.trim(),
    descricao: dados.descricao?.trim() || null,
    preco: dados.preco,
    imagem_url: dados.imagem_url || null,
    grupo: dados.grupo?.trim() || "Opcionais",
    obrigatorio: dados.obrigatorio ?? false,
    min_qtd: dados.min_qtd ?? 0,
    max_qtd: dados.max_qtd ?? 10,
    disponivel: dados.disponivel ?? true,
    ordem: dados.ordem ?? 0,
  };
  let imagemAnterior: string | null = null;
  if (dados.id) {
    const { data: anterior } = await supabase
      .from("cardapio_exemplo_adicionais")
      .select("imagem_url")
      .eq("id", dados.id)
      .maybeSingle();
    imagemAnterior = (anterior as { imagem_url?: string | null } | null)?.imagem_url ?? null;
  }
  const resposta = dados.id
    ? await supabase.from("cardapio_exemplo_adicionais").update(registro).eq("id", dados.id).select("*").single()
    : await supabase.from("cardapio_exemplo_adicionais").insert(registro).select("*").single();
  if (resposta.error) falhar(resposta.error);
  if (imagemAnterior && imagemAnterior !== registro.imagem_url) await removerImagens([imagemAnterior]);
  return mapAdicional(resposta.data as Row);
}

export async function excluirAdicional(id: string): Promise<void> {
  const { data: anterior } = await supabase
    .from("cardapio_exemplo_adicionais")
    .select("imagem_url")
    .eq("id", id)
    .maybeSingle();
  const { error } = await supabase.from("cardapio_exemplo_adicionais").delete().eq("id", id);
  if (error) falhar(error);
  const imagem = (anterior as { imagem_url?: string | null } | null)?.imagem_url;
  if (imagem) await removerImagens([imagem]);
}

export async function salvarCombo(
  dados: Partial<Combo> & { nome: string; preco: number },
  itens: { produto_id: string; quantidade: number }[],
): Promise<string> {
  let imagemAnterior: string | null = null;
  if (dados.id) {
    const { data: anterior } = await supabase
      .from("cardapio_exemplo_combos")
      .select("imagem_url")
      .eq("id", dados.id)
      .maybeSingle();
    imagemAnterior = (anterior as { imagem_url?: string | null } | null)?.imagem_url ?? null;
  }
  const { data, error } = await supabase.rpc("cardapio_exemplo_admin_salvar_combo", {
    p_combo: {
      id: dados.id ?? null,
      nome: dados.nome,
      descricao: dados.descricao ?? null,
      imagem_url: dados.imagem_url ?? null,
      preco: dados.preco,
      disponivel: dados.disponivel ?? true,
      destaque: dados.destaque ?? false,
      ordem: dados.ordem ?? 0,
      ativo: dados.ativo ?? true,
    },
    p_itens: itens,
  });
  if (error) falhar(error);
  if (imagemAnterior && imagemAnterior !== (dados.imagem_url ?? null)) await removerImagens([imagemAnterior]);
  return String(data);
}

export async function excluirCombo(id: string): Promise<void> {
  const { data: anterior } = await supabase
    .from("cardapio_exemplo_combos")
    .select("imagem_url")
    .eq("id", id)
    .maybeSingle();
  const { error } = await supabase.from("cardapio_exemplo_combos").delete().eq("id", id);
  if (error) falhar(error);
  const imagem = (anterior as { imagem_url?: string | null } | null)?.imagem_url;
  if (imagem) await removerImagens([imagem]);
}

export async function salvarBanner(dados: Partial<Banner> & { titulo: string }): Promise<Banner> {
  const registro = {
    titulo: dados.titulo.trim(),
    subtitulo: dados.subtitulo?.trim() || null,
    imagem_url: dados.imagem_url || null,
    link_url: dados.link_url?.trim() || null,
    ordem: dados.ordem ?? 0,
    ativo: dados.ativo ?? true,
  };
  let imagemAnterior: string | null = null;
  if (dados.id) {
    const { data: anterior } = await supabase
      .from("cardapio_exemplo_banners")
      .select("imagem_url")
      .eq("id", dados.id)
      .maybeSingle();
    imagemAnterior = (anterior as { imagem_url?: string | null } | null)?.imagem_url ?? null;
  }
  const resposta = dados.id
    ? await supabase.from("cardapio_exemplo_banners").update(registro).eq("id", dados.id).select("*").single()
    : await supabase.from("cardapio_exemplo_banners").insert(registro).select("*").single();
  if (resposta.error) falhar(resposta.error);
  if (imagemAnterior && imagemAnterior !== registro.imagem_url) await removerImagens([imagemAnterior]);
  return mapBanner(resposta.data as Row);
}

export async function excluirBanner(id: string): Promise<void> {
  const { data: anterior } = await supabase
    .from("cardapio_exemplo_banners")
    .select("imagem_url")
    .eq("id", id)
    .maybeSingle();
  const { error } = await supabase.from("cardapio_exemplo_banners").delete().eq("id", id);
  if (error) falhar(error);
  const imagem = (anterior as { imagem_url?: string | null } | null)?.imagem_url;
  if (imagem) await removerImagens([imagem]);
}

export async function salvarCupom(dados: Partial<Cupom> & { codigo: string; valor: number }): Promise<Cupom> {
  const registro = {
    codigo: dados.codigo.trim().toUpperCase(),
    tipo: dados.tipo ?? "percentual",
    valor: dados.valor,
    pedido_minimo: dados.pedido_minimo ?? 0,
    desconto_maximo: dados.desconto_maximo ?? null,
    usos_maximos: dados.usos_maximos ?? null,
    valido_de: dados.valido_de || null,
    valido_ate: dados.valido_ate || null,
    ativo: dados.ativo ?? true,
  };
  const resposta = dados.id
    ? await supabase.from("cardapio_exemplo_cupons").update(registro).eq("id", dados.id).select("*").single()
    : await supabase.from("cardapio_exemplo_cupons").insert(registro).select("*").single();
  if (resposta.error) falhar(resposta.error);
  return mapCupom(resposta.data as Row);
}

export async function excluirCupom(id: string): Promise<void> {
  const { error } = await supabase.from("cardapio_exemplo_cupons").delete().eq("id", id);
  if (error) falhar(error);
}

export async function salvarConfiguracoes(patch: Partial<Configuracoes>): Promise<Configuracoes> {
  const { data: anterior } = await supabase
    .from("cardapio_exemplo_configuracoes")
    .select("logo_url, banner_url")
    .eq("id", 1)
    .maybeSingle();
  const resposta = await supabase
    .from("cardapio_exemplo_configuracoes")
    .update(patch)
    .eq("id", 1)
    .select("*")
    .single();
  if (resposta.error) falhar(resposta.error);
  const antigo = anterior as { logo_url?: string | null; banner_url?: string | null } | null;
  const remover: string[] = [];
  if (antigo?.logo_url && "logo_url" in patch && antigo.logo_url !== patch.logo_url) remover.push(antigo.logo_url);
  if (antigo?.banner_url && "banner_url" in patch && antigo.banner_url !== patch.banner_url) remover.push(antigo.banner_url);
  if (remover.length) await removerImagens(remover);
  return mapConfig(resposta.data as Row);
}

export async function salvarHorarios(horarios: { dia_semana: number; sequencia: number; fechado: boolean; abre: string | null; fecha: string | null }[]): Promise<Horario[]> {
  const { data, error } = await supabase
    .from("cardapio_exemplo_horarios")
    .upsert(horarios, { onConflict: "dia_semana,sequencia" })
    .select("*");
  if (error) falhar(error);
  return (data ?? []).map((row) => mapHorario(row as Row));
}

export async function atualizarStatusPedido(id: string, status: StatusPedido): Promise<void> {
  const { error } = await supabase.from("cardapio_exemplo_pedidos").update({ status }).eq("id", id);
  if (error) falhar(error);
}

export async function atualizarPagamentoPedido(id: string, status_pagamento: StatusPagamento): Promise<void> {
  const { error } = await supabase.from("cardapio_exemplo_pedidos").update({ status_pagamento }).eq("id", id);
  if (error) falhar(error);
}

export async function excluirPedido(id: string): Promise<void> {
  const { error } = await supabase.from("cardapio_exemplo_pedidos").delete().eq("id", id);
  if (error) falhar(error);
}

export async function aprovarAvaliacao(id: string, aprovado: boolean): Promise<void> {
  const { error } = await supabase.from("cardapio_exemplo_avaliacoes").update({ aprovado }).eq("id", id);
  if (error) falhar(error);
}

export async function excluirAvaliacao(id: string): Promise<void> {
  const { error } = await supabase.from("cardapio_exemplo_avaliacoes").delete().eq("id", id);
  if (error) falhar(error);
}

export async function atualizarNomePerfil(nome: string): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Sessão expirada.");
  const { error } = await supabase.from("cardapio_exemplo_perfis").update({ nome: nome.trim() }).eq("id", auth.user.id);
  if (error) falhar(error);
}

export async function reordenar(tabela: "categorias" | "produtos" | "banners", ids: string[]): Promise<void> {
  const resultados = await Promise.all(
    ids.map((id, indice) =>
      supabase
        .from(`cardapio_exemplo_${tabela}`)
        .update({ ordem: indice })
        .eq("id", id),
    ),
  );
  const comErro = resultados.find((r) => r.error);
  if (comErro?.error) falhar(comErro.error);
}

export function avaliacaoParaMapa(lista: Avaliacao[]): Map<string, Avaliacao> {
  return new Map(lista.map((avaliacao) => [avaliacao.pedido_id, avaliacao]));
}

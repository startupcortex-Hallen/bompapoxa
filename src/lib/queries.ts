import { queryOptions } from "@tanstack/react-query";
import { supabase, supabaseConfigurado } from "@/integrations/supabase/client";
import { estaAbertoLocal } from "./hours";
import {
  agruparPor,
  mapAdicional,
  mapAvaliacao,
  mapBanner,
  mapCategoria,
  mapCombo,
  mapComboGrupo,
  mapComboItem,
  mapComboOpcao,
  mapConfig,
  mapConfiguracaoPagamento,
  mapCupom,
  mapEventoPagamento,
  mapHistorico,
  mapHorario,
  mapImpressora,
  mapItemPedido,
  mapPagamento,
  mapPedido,
  mapPerfil,
  mapProduto,
  mapTrabalhoImpressao,
} from "./mappers";
import type {
  Adicional,
  Avaliacao,
  Banner,
  CardapioPublico,
  Categoria,
  Combo,
  ConfiguracaoPagamento,
  Configuracoes,
  Cupom,
  EventoPagamento,
  Horario,
  Impressora,
  ItemPedido,
  Pagamento,
  PagamentoPublico,
  Pedido,
  Perfil,
  Produto,
  TrabalhoImpressao,
} from "./types";

type Row = Record<string, unknown>;
const rows = (data: unknown): Row[] => (Array.isArray(data) ? (data as Row[]) : []);

function exigirConfigurado() {
  if (!supabaseConfigurado) {
    throw new Error(
      "A conexão com o Supabase não está configurada. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no build.",
    );
  }
}

export const chaves = {
  cardapio: ["cardapio-publico"] as const,
  adminCategorias: ["admin", "categorias"] as const,
  adminProdutos: ["admin", "produtos"] as const,
  adminAdicionais: ["admin", "adicionais"] as const,
  adminCombos: ["admin", "combos"] as const,
  adminBanners: ["admin", "banners"] as const,
  adminCupons: ["admin", "cupons"] as const,
  adminPedidos: ["admin", "pedidos"] as const,
  adminAvaliacoes: ["admin", "avaliacoes"] as const,
  adminConfiguracoes: ["admin", "configuracoes"] as const,
  adminDashboard: ["admin", "dashboard"] as const,
  adminPerfil: ["admin", "perfil"] as const,
  adminPagamentos: ["admin", "pagamentos"] as const,
  adminPagamentoEventos: ["admin", "pagamento-eventos"] as const,
  adminImpressoras: ["admin", "impressoras"] as const,
  adminFilaImpressao: ["admin", "fila-impressao"] as const,
  adminPagamentoConfig: ["admin", "pagamento-config"] as const,
  pagamentoPublico: ["pagamento-publico"] as const,
};

export async function carregarConfiguracoes(): Promise<Configuracoes> {
  exigirConfigurado();
  const { data, error } = await supabase
    .from("cardapio_exemplo_configuracoes")
    .select("*")
    .eq("id", 1)
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    throw new Error(
      "O cardápio ainda não foi configurado no banco. Execute a migration do BOM PA POXA no Supabase.",
    );
  }
  return mapConfig(data as Row);
}

export async function carregarHorarios(): Promise<Horario[]> {
  const { data, error } = await supabase
    .from("cardapio_exemplo_horarios")
    .select("*")
    .order("dia_semana")
    .order("sequencia");
  if (error) throw error;
  return rows(data).map(mapHorario);
}

export async function carregarCardapioPublico(): Promise<CardapioPublico> {
  const configuracoes = await carregarConfiguracoes();
  const [
    categorias,
    produtos,
    adicionais,
    combos,
    comboItens,
    comboGrupos,
    comboOpcoes,
    banners,
    horarios,
    avaliacoes,
    respostaAberto,
  ] = await Promise.all([
    supabase.from("cardapio_exemplo_categorias").select("*").eq("ativo", true).order("ordem"),
    supabase
      .from("cardapio_exemplo_produtos")
      .select("*")
      .eq("ativo", true)
      .order("ordem")
      .order("created_at"),
    supabase.from("cardapio_exemplo_adicionais").select("*").eq("disponivel", true).order("ordem"),
    supabase.from("cardapio_exemplo_combos").select("*").eq("ativo", true).order("ordem"),
    supabase.from("cardapio_exemplo_combo_itens").select("*"),
    supabase.from("cardapio_exemplo_combo_grupos").select("*").order("ordem"),
    supabase.from("cardapio_exemplo_combo_opcoes").select("*").order("ordem"),
    supabase.from("cardapio_exemplo_banners").select("*").eq("ativo", true).order("ordem"),
    carregarHorarios(),
    supabase
      .from("cardapio_exemplo_avaliacoes")
      .select("*")
      .eq("aprovado", true)
      .order("created_at", { ascending: false })
      .limit(12),
    supabase.rpc("cardapio_exemplo_esta_aberto"),
  ]);

  for (const resposta of [
    categorias,
    produtos,
    adicionais,
    combos,
    comboItens,
    comboGrupos,
    comboOpcoes,
    banners,
    avaliacoes,
  ]) {
    if (resposta.error) throw resposta.error;
  }

  const adicionaisPorProduto = agruparPor(rows(adicionais.data).map(mapAdicional), (item) => item.produto_id);
  const itensPorCombo = agruparPor(rows(comboItens.data).map(mapComboItem), (item) => item.combo_id);
  const listaProdutos = rows(produtos.data).map((row) => mapProduto(row, adicionaisPorProduto.get(String(row.id)) ?? []));
  const nomesProdutos = new Map(listaProdutos.map((produto) => [produto.id, produto.nome]));
  const produtosPorId = new Map(listaProdutos.map((produto) => [produto.id, produto]));

  const opcoesPorGrupo = agruparPor(rows(comboOpcoes.data).map(mapComboOpcao), (opcao) => opcao.grupo_id);
  const gruposPorCombo = agruparPor(
    rows(comboGrupos.data).map((row) =>
      mapComboGrupo(
        row,
        (opcoesPorGrupo.get(String(row.id)) ?? []).map((opcao) => {
          const produto = produtosPorId.get(opcao.produto_id);
          return {
            ...opcao,
            produto_nome: nomesProdutos.get(opcao.produto_id) ?? "Item do combo",
            produto_disponivel: Boolean(produto?.disponivel && produto.ativo),
          };
        }),
      ),
    ),
    (grupo) => grupo.combo_id,
  );

  const listaCombos = rows(combos.data).map((row) => {
    const itens = (itensPorCombo.get(String(row.id)) ?? []).map((item) => ({
      ...item,
      produto_nome: nomesProdutos.get(item.produto_id) ?? "Item do combo",
    }));
    const grupos = gruposPorCombo.get(String(row.id)) ?? [];
    const combo = mapCombo(row, itens, grupos);
    const itensDisponiveis =
      itens.length > 0 &&
      itens.every((item) => {
        const produto = produtosPorId.get(item.produto_id);
        return Boolean(produto?.disponivel && produto.ativo);
      });
    const gruposDisponiveis = grupos.every((grupo) => {
      const minimo = grupo.obrigatorio ? Math.max(grupo.min_qtd, 1) : grupo.min_qtd;
      const disponiveis = grupo.opcoes.filter((opcao) => {
        const produto = produtosPorId.get(opcao.produto_id);
        return Boolean(produto?.disponivel && produto.ativo);
      });
      return disponiveis.length >= minimo;
    });
    return { ...combo, disponivel: combo.disponivel && itensDisponiveis && gruposDisponiveis };
  });

  const listaHorarios = horarios;
  const statusAberto = respostaAberto.error ? estaAbertoLocal(configuracoes, listaHorarios) : Boolean(respostaAberto.data);

  return {
    configuracoes,
    categorias: rows(categorias.data).map(mapCategoria).filter((categoria) => categoria.ativo),
    produtos: listaProdutos,
    combos: listaCombos,
    banners: rows(banners.data).map(mapBanner),
    horarios: listaHorarios,
    avaliacoes: rows(avaliacoes.data).map(mapAvaliacao),
    aberto: statusAberto,
  };
}

export const cardapioQuery = queryOptions({
  queryKey: chaves.cardapio,
  queryFn: carregarCardapioPublico,
  staleTime: 30_000,
  refetchInterval: 60_000,
  refetchOnWindowFocus: true,
});

export const layoutPublicoQuery = queryOptions({
  queryKey: ["layout-publico"] as const,
  queryFn: async () => {
    const [configuracoes, horarios] = await Promise.all([carregarConfiguracoes(), carregarHorarios()]);
    const resposta = await supabase.rpc("cardapio_exemplo_esta_aberto");
    return {
      configuracoes,
      horarios,
      aberto: resposta.error ? estaAbertoLocal(configuracoes, horarios) : Boolean(resposta.data),
    };
  },
  staleTime: 30_000,
  refetchInterval: 60_000,
});

export async function carregarPagamentoPublico(): Promise<PagamentoPublico> {
  try {
    const { data, error } = await supabase.rpc("cardapio_exemplo_pagamento_publico");
    if (error) throw error;
    const row = (data && typeof data === "object" ? data : {}) as Row;
    return {
      mercadopago_ativo: row.mercadopago_ativo === true,
      pix_online: row.pix_online === true,
      cartao_online: row.cartao_online === true,
    };
  } catch {
    return { mercadopago_ativo: false, pix_online: false, cartao_online: false };
  }
}

export const pagamentoPublicoQuery = queryOptions({
  queryKey: chaves.pagamentoPublico,
  queryFn: carregarPagamentoPublico,
  staleTime: 60_000,
  refetchInterval: 120_000,
});

export async function carregarAdminCategorias(): Promise<Categoria[]> {
  const { data, error } = await supabase
    .from("cardapio_exemplo_categorias")
    .select("*")
    .order("ordem")
    .order("created_at");
  if (error) throw error;
  return rows(data).map(mapCategoria);
}

export async function carregarAdminProdutos(): Promise<{ categorias: Categoria[]; produtos: Produto[] }> {
  const [categorias, produtos, adicionais] = await Promise.all([
    supabase.from("cardapio_exemplo_categorias").select("*").order("ordem"),
    supabase.from("cardapio_exemplo_produtos").select("*").order("ordem").order("created_at"),
    supabase.from("cardapio_exemplo_adicionais").select("*").order("ordem"),
  ]);
  if (categorias.error) throw categorias.error;
  if (produtos.error) throw produtos.error;
  if (adicionais.error) throw adicionais.error;
  const adicionaisPorProduto = agruparPor(rows(adicionais.data).map(mapAdicional), (item) => item.produto_id);
  return {
    categorias: rows(categorias.data).map(mapCategoria),
    produtos: rows(produtos.data).map((row) => mapProduto(row, adicionaisPorProduto.get(String(row.id)) ?? [])),
  };
}

export async function carregarAdminAdicionais(): Promise<{ produtos: Produto[]; adicionais: Adicional[] }> {
  const [produtos, adicionais] = await Promise.all([
    supabase.from("cardapio_exemplo_produtos").select("*").order("ordem"),
    supabase.from("cardapio_exemplo_adicionais").select("*").order("produto_id").order("ordem"),
  ]);
  if (produtos.error) throw produtos.error;
  if (adicionais.error) throw adicionais.error;
  return {
    produtos: rows(produtos.data).map((row) => mapProduto(row, [])),
    adicionais: rows(adicionais.data).map(mapAdicional),
  };
}

export async function carregarAdminCombos(): Promise<{ combos: Combo[]; produtos: Produto[] }> {
  const [combos, itens, grupos, opcoes, produtos] = await Promise.all([
    supabase.from("cardapio_exemplo_combos").select("*").order("ordem"),
    supabase.from("cardapio_exemplo_combo_itens").select("*"),
    supabase.from("cardapio_exemplo_combo_grupos").select("*").order("ordem"),
    supabase.from("cardapio_exemplo_combo_opcoes").select("*").order("ordem"),
    supabase.from("cardapio_exemplo_produtos").select("*").order("nome"),
  ]);
  if (combos.error) throw combos.error;
  if (itens.error) throw itens.error;
  if (grupos.error) throw grupos.error;
  if (opcoes.error) throw opcoes.error;
  if (produtos.error) throw produtos.error;
  const nomes = new Map(rows(produtos.data).map((p) => [String(p.id), String(p.nome ?? "")]));
  const porCombo = agruparPor(rows(itens.data).map(mapComboItem), (item) => item.combo_id);
  const opcoesPorGrupo = agruparPor(rows(opcoes.data).map(mapComboOpcao), (opcao) => opcao.grupo_id);
  const gruposPorCombo = agruparPor(
    rows(grupos.data).map((row) =>
      mapComboGrupo(
        row,
        (opcoesPorGrupo.get(String(row.id)) ?? []).map((opcao) => ({
          ...opcao,
          produto_nome: nomes.get(opcao.produto_id) ?? "Produto",
        })),
      ),
    ),
    (grupo) => grupo.combo_id,
  );
  return {
    combos: rows(combos.data).map((row) => {
      const lista = (porCombo.get(String(row.id)) ?? []).map((item) => ({
        ...item,
        produto_nome: nomes.get(item.produto_id) ?? "Produto",
      }));
      const listaGrupos = gruposPorCombo.get(String(row.id)) ?? [];
      return mapCombo(row, lista, listaGrupos);
    }),
    produtos: rows(produtos.data).map((row) => mapProduto(row, [])),
  };
}

export async function carregarAdminBanners(): Promise<Banner[]> {
  const { data, error } = await supabase.from("cardapio_exemplo_banners").select("*").order("ordem");
  if (error) throw error;
  return rows(data).map(mapBanner);
}

export async function carregarAdminCupons(): Promise<Cupom[]> {
  const { data, error } = await supabase
    .from("cardapio_exemplo_cupons")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return rows(data).map(mapCupom);
}

export async function carregarAdminPedidos(): Promise<Pedido[]> {
  const { data, error } = await supabase
    .from("cardapio_exemplo_pedidos")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  const pedidos = rows(data);
  if (!pedidos.length) return [];
  const ids = pedidos.map((p) => String(p.id));
  const [itens, historico, pagamentos] = await Promise.all([
    supabase.from("cardapio_exemplo_itens_pedido").select("*").in("pedido_id", ids),
    supabase.from("cardapio_exemplo_historico_pedidos").select("*").in("pedido_id", ids).order("created_at"),
    supabase.from("cardapio_exemplo_pagamentos").select("*").in("pedido_id", ids),
  ]);
  if (itens.error) throw itens.error;
  if (historico.error) throw historico.error;
  const itensPorPedido = agruparPor(rows(itens.data).map(mapItemPedido), (item: ItemPedido) => item.pedido_id);
  const historicoPorPedido = agruparPor(rows(historico.data).map(mapHistorico), (item) => item.pedido_id);
  const pagamentosPorPedido = pagamentos.error
    ? new Map<string, Pagamento>()
    : new Map(rows(pagamentos.data).map(mapPagamento).map((pagamento) => [pagamento.pedido_id, pagamento]));
  return pedidos.map((row) =>
    mapPedido(
      row,
      itensPorPedido.get(String(row.id)) ?? [],
      historicoPorPedido.get(String(row.id)) ?? [],
      pagamentosPorPedido.get(String(row.id)) ?? null,
    ),
  );
}

export async function carregarAdminPagamentos(): Promise<Pagamento[]> {
  const { data, error } = await supabase
    .from("cardapio_exemplo_pagamentos")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return rows(data).map(mapPagamento);
}

export async function carregarAdminPagamentoEventos(): Promise<EventoPagamento[]> {
  const { data, error } = await supabase
    .from("cardapio_exemplo_pagamento_eventos")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return rows(data).map(mapEventoPagamento);
}

export async function carregarAdminPagamentoConfig(): Promise<ConfiguracaoPagamento | null> {
  const { data, error } = await supabase
    .from("cardapio_exemplo_pagamento_config")
    .select("*")
    .eq("id", 1)
    .maybeSingle();
  if (error) throw error;
  return data ? mapConfiguracaoPagamento(data as Row) : null;
}

export async function carregarAdminImpressoras(): Promise<Impressora[]> {
  const { data, error } = await supabase
    .from("cardapio_exemplo_impressoras")
    .select("*")
    .order("created_at");
  if (error) throw error;
  return rows(data).map(mapImpressora);
}

export async function carregarAdminFilaImpressao(): Promise<TrabalhoImpressao[]> {
  const { data, error } = await supabase
    .from("cardapio_exemplo_fila_impressao")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  const trabalhos = rows(data).map(mapTrabalhoImpressao);
  const ids = [...new Set(trabalhos.map((job) => job.pedido_id).filter((id): id is string => Boolean(id)))];
  const nomesImpressoras = new Map(
    (await carregarAdminImpressoras().catch(() => [])).map((impressora) => [impressora.id, impressora.nome]),
  );
  let numeros = new Map<string, number>();
  if (ids.length) {
    const pedidos = await supabase
      .from("cardapio_exemplo_pedidos")
      .select("id, numero")
      .in("id", ids);
    if (!pedidos.error) numeros = new Map(rows(pedidos.data).map((row) => [String(row.id), Number(row.numero)]));
  }
  return trabalhos.map((job) => ({
    ...job,
    pedido_numero: job.pedido_id ? (numeros.get(job.pedido_id) ?? null) : null,
    impressora_nome: job.impressora_id ? (nomesImpressoras.get(job.impressora_id) ?? null) : null,
  }));
}

export async function carregarAdminAvaliacoes(): Promise<Avaliacao[]> {
  const { data, error } = await supabase
    .from("cardapio_exemplo_avaliacoes")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(300);
  if (error) throw error;
  return rows(data).map(mapAvaliacao);
}

export async function carregarAdminConfiguracoes(): Promise<{
  configuracoes: Configuracoes;
  horarios: Horario[];
}> {
  const [configuracoes, horarios] = await Promise.all([carregarConfiguracoes(), carregarHorarios()]);
  return { configuracoes, horarios };
}

export type MetricasDashboard = {
  totalProdutos: number;
  produtosDisponiveis: number;
  produtosIndisponiveis: number;
  totalCategorias: number;
  pedidosHoje: number;
  emAndamento: number;
  faturamentoHoje: number;
  faturamento30Dias: number;
  pagamentosPendentes: number;
  valorPendente: number;
  avaliacoesPendentes: number;
  cuponsAtivos: number;
  ultimosPedidos: Pedido[];
};

export async function carregarDashboard(): Promise<MetricasDashboard> {
  const inicioHoje = new Date();
  inicioHoje.setHours(0, 0, 0, 0);
  const inicio30 = new Date(Date.now() - 30 * 24 * 3600 * 1000);
  const [produtos, categorias, pedidosHoje, emAndamento, pedidos30, avaliacoes, cupons, ultimos] =
    await Promise.all([
      supabase.from("cardapio_exemplo_produtos").select("id, disponivel, ativo"),
      supabase.from("cardapio_exemplo_categorias").select("id", { count: "exact", head: true }),
      supabase
        .from("cardapio_exemplo_pedidos")
        .select("total, status, status_pagamento")
        .gte("created_at", inicioHoje.toISOString())
        .neq("status", "cancelado"),
      supabase
        .from("cardapio_exemplo_pedidos")
        .select("id", { count: "exact", head: true })
        .in("status", ["novo", "em_preparo", "pronto", "saiu_entrega"]),
      supabase
        .from("cardapio_exemplo_pedidos")
        .select("total, status")
        .gte("created_at", inicio30.toISOString())
        .neq("status", "cancelado"),
      supabase
        .from("cardapio_exemplo_avaliacoes")
        .select("id", { count: "exact", head: true })
        .eq("aprovado", false),
      supabase
        .from("cardapio_exemplo_cupons")
        .select("id", { count: "exact", head: true })
        .eq("ativo", true),
      supabase
        .from("cardapio_exemplo_pedidos")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(6),
    ]);

  for (const resposta of [produtos, categorias, pedidosHoje, emAndamento, pedidos30, avaliacoes, cupons, ultimos]) {
    if (resposta.error) throw resposta.error;
  }

  const listaProdutos = rows(produtos.data);
  const listaHoje = rows(pedidosHoje.data);
  const lista30 = rows(pedidos30.data);
  const ultimosPedidos = rows(ultimos.data);
  const ids = ultimosPedidos.map((p) => String(p.id));
  let itens: ItemPedido[] = [];
  if (ids.length) {
    const resposta = await supabase.from("cardapio_exemplo_itens_pedido").select("*").in("pedido_id", ids);
    if (resposta.error) throw resposta.error;
    itens = rows(resposta.data).map(mapItemPedido);
  }
  const itensPorPedido = agruparPor(itens, (item) => item.pedido_id);

  return {
    totalProdutos: listaProdutos.length,
    produtosDisponiveis: listaProdutos.filter((p) => p.disponivel && p.ativo).length,
    produtosIndisponiveis: listaProdutos.filter((p) => !p.disponivel || !p.ativo).length,
    totalCategorias: categorias.count ?? 0,
    pedidosHoje: listaHoje.length,
    emAndamento: emAndamento.count ?? 0,
    faturamentoHoje: listaHoje.reduce((soma, p) => soma + Number(p.total ?? 0), 0),
    faturamento30Dias: lista30.reduce((soma, p) => soma + Number(p.total ?? 0), 0),
    pagamentosPendentes: listaHoje.filter((p) => p.status_pagamento === "pendente").length,
    valorPendente: listaHoje
      .filter((p) => p.status_pagamento === "pendente")
      .reduce((soma, p) => soma + Number(p.total ?? 0), 0),
    avaliacoesPendentes: avaliacoes.count ?? 0,
    cuponsAtivos: cupons.count ?? 0,
    ultimosPedidos: ultimosPedidos.map((row) => mapPedido(row, itensPorPedido.get(String(row.id)) ?? [])),
  };
}

export async function carregarPerfil(): Promise<{ perfil: Perfil | null; email: string | null }> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { perfil: null, email: null };
  const { data, error } = await supabase
    .from("cardapio_exemplo_perfis")
    .select("*")
    .eq("id", auth.user.id)
    .maybeSingle();
  if (error) throw error;
  return { perfil: data ? mapPerfil(data as Row) : null, email: auth.user.email ?? null };
}

export const adminCategoriasQuery = queryOptions({ queryKey: chaves.adminCategorias, queryFn: carregarAdminCategorias });
export const adminProdutosQuery = queryOptions({ queryKey: chaves.adminProdutos, queryFn: carregarAdminProdutos });
export const adminAdicionaisQuery = queryOptions({
  queryKey: chaves.adminAdicionais,
  queryFn: carregarAdminAdicionais,
});
export const adminCombosQuery = queryOptions({ queryKey: chaves.adminCombos, queryFn: carregarAdminCombos });
export const adminBannersQuery = queryOptions({ queryKey: chaves.adminBanners, queryFn: carregarAdminBanners });
export const adminCuponsQuery = queryOptions({ queryKey: chaves.adminCupons, queryFn: carregarAdminCupons });
export const adminPedidosQuery = queryOptions({
  queryKey: chaves.adminPedidos,
  queryFn: carregarAdminPedidos,
  refetchInterval: 15_000,
});
export const adminAvaliacoesQuery = queryOptions({
  queryKey: chaves.adminAvaliacoes,
  queryFn: carregarAdminAvaliacoes,
});
export const adminConfiguracoesQuery = queryOptions({
  queryKey: chaves.adminConfiguracoes,
  queryFn: carregarAdminConfiguracoes,
});
export const adminDashboardQuery = queryOptions({
  queryKey: chaves.adminDashboard,
  queryFn: carregarDashboard,
  refetchInterval: 30_000,
});
export const adminPerfilQuery = queryOptions({ queryKey: chaves.adminPerfil, queryFn: carregarPerfil });
export const adminPagamentosQuery = queryOptions({
  queryKey: chaves.adminPagamentos,
  queryFn: carregarAdminPagamentos,
  refetchInterval: 30_000,
});
export const adminPagamentoEventosQuery = queryOptions({
  queryKey: chaves.adminPagamentoEventos,
  queryFn: carregarAdminPagamentoEventos,
});
export const adminPagamentoConfigQuery = queryOptions({
  queryKey: chaves.adminPagamentoConfig,
  queryFn: carregarAdminPagamentoConfig,
});
export const adminImpressorasQuery = queryOptions({
  queryKey: chaves.adminImpressoras,
  queryFn: carregarAdminImpressoras,
  refetchInterval: 20_000,
});
export const adminFilaImpressaoQuery = queryOptions({
  queryKey: chaves.adminFilaImpressao,
  queryFn: carregarAdminFilaImpressao,
  refetchInterval: 10_000,
});



import { numero } from "./format";
import type {
  Adicional,
  Avaliacao,
  Banner,
  Categoria,
  Combo,
  ComboGrupo,
  ComboItem,
  ComboOpcao,
  ConfiguracaoPagamento,
  Configuracoes,
  Cupom,
  EventoPagamento,
  HistoricoPedido,
  Horario,
  Impressora,
  ItemAdicional,
  ItemPedido,
  Pagamento,
  Pedido,
  Perfil,
  Produto,
  StatusImpressao,
  StatusPagamento,
  StatusPedido,
  TrabalhoImpressao,
} from "./types";

type Row = Record<string, unknown>;

const texto = (valor: unknown): string | null => (typeof valor === "string" ? valor : null);
const textoOu = (valor: unknown, padrao = ""): string => (typeof valor === "string" ? valor : padrao);
const booleano = (valor: unknown): boolean => valor === true;
const listaTexto = (valor: unknown): string[] =>
  Array.isArray(valor) ? valor.filter((item): item is string => typeof item === "string") : [];

export function mapConfig(row: Row): Configuracoes {
  return {
    id: numero(row.id),
    nome_estabelecimento: textoOu(row.nome_estabelecimento, "BOM PA POXA"),
    descricao: texto(row.descricao),
    logo_url: texto(row.logo_url),
    banner_url: texto(row.banner_url),
    instagram_url: texto(row.instagram_url),
    whatsapp: texto(row.whatsapp),
    telefone: texto(row.telefone),
    email: texto(row.email),
    endereco: texto(row.endereco),
    bairro: texto(row.bairro),
    cidade: texto(row.cidade),
    estado: texto(row.estado),
    cep: texto(row.cep),
    mapa_url: texto(row.mapa_url),
    cor_primaria: textoOu(row.cor_primaria, "#B23A2A"),
    cor_secundaria: textoOu(row.cor_secundaria, "#F1E3CF"),
    cor_destaque: textoOu(row.cor_destaque, "#E8A33D"),
    cor_fundo: textoOu(row.cor_fundo, "#FAF5EC"),
    cor_texto: textoOu(row.cor_texto, "#2A1710"),
    tipografia: textoOu(row.tipografia, "fraunces_figtree"),
    aceita_delivery: row.aceita_delivery !== false,
    aceita_retirada: row.aceita_retirada !== false,
    taxa_entrega: numero(row.taxa_entrega),
    frete_gratis_acima_de: row.frete_gratis_acima_de == null ? null : numero(row.frete_gratis_acima_de),
    pedido_minimo: numero(row.pedido_minimo),
    tempo_entrega_min: numero(row.tempo_entrega_min),
    tempo_retirada_min: numero(row.tempo_retirada_min),
    status_abertura: (texto(row.status_abertura) as Configuracoes["status_abertura"]) ?? "automatico",
    aceitando_pedidos: row.aceitando_pedidos !== false,
    formas_pagamento: listaTexto(row.formas_pagamento),
    mensagem_boas_vindas: texto(row.mensagem_boas_vindas),
    rodape: texto(row.rodape),
    updated_at: textoOu(row.updated_at, new Date().toISOString()),
  };
}

export function mapCategoria(row: Row): Categoria {
  return {
    id: textoOu(row.id),
    nome: textoOu(row.nome),
    descricao: texto(row.descricao),
    imagem_url: texto(row.imagem_url),
    ordem: numero(row.ordem),
    ativo: row.ativo !== false,
    destaque: booleano(row.destaque),
    created_at: textoOu(row.created_at),
    updated_at: textoOu(row.updated_at),
  };
}

export function mapAdicional(row: Row): Adicional {
  return {
    id: textoOu(row.id),
    produto_id: textoOu(row.produto_id),
    nome: textoOu(row.nome),
    descricao: texto(row.descricao),
    preco: numero(row.preco),
    imagem_url: texto(row.imagem_url),
    grupo: textoOu(row.grupo, "Opcionais"),
    obrigatorio: booleano(row.obrigatorio),
    min_qtd: numero(row.min_qtd),
    max_qtd: numero(row.max_qtd),
    disponivel: row.disponivel !== false,
    ordem: numero(row.ordem),
    created_at: textoOu(row.created_at),
    updated_at: textoOu(row.updated_at),
  };
}

export function mapProduto(row: Row, adicionais: Adicional[]): Produto {
  return {
    id: textoOu(row.id),
    categoria_id: textoOu(row.categoria_id),
    nome: textoOu(row.nome),
    descricao: texto(row.descricao),
    preco: numero(row.preco),
    preco_promocional: row.preco_promocional == null ? null : numero(row.preco_promocional),
    imagem_url: texto(row.imagem_url),
    galeria: listaTexto(row.galeria),
    ingredientes: listaTexto(row.ingredientes),
    disponivel: row.disponivel !== false,
    destaque: booleano(row.destaque),
    tempo_preparo_min: row.tempo_preparo_min == null ? null : numero(row.tempo_preparo_min),
    ordem: numero(row.ordem),
    ativo: row.ativo !== false,
    min_adicionais: numero(row.min_adicionais),
    max_adicionais: numero(row.max_adicionais),
    created_at: textoOu(row.created_at),
    updated_at: textoOu(row.updated_at),
    adicionais,
  };
}

export function mapComboItem(row: Row): ComboItem {
  return {
    id: textoOu(row.id),
    combo_id: textoOu(row.combo_id),
    produto_id: textoOu(row.produto_id),
    quantidade: numero(row.quantidade),
  };
}

export function mapComboOpcao(row: Row): ComboOpcao {
  return {
    id: textoOu(row.id),
    grupo_id: textoOu(row.grupo_id),
    produto_id: textoOu(row.produto_id),
    quantidade: numero(row.quantidade),
    rotulo: texto(row.rotulo),
    ordem: numero(row.ordem),
  };
}

export function mapComboGrupo(row: Row, opcoes: ComboOpcao[]): ComboGrupo {
  return {
    id: textoOu(row.id),
    combo_id: textoOu(row.combo_id),
    nome: textoOu(row.nome),
    min_qtd: numero(row.min_qtd),
    max_qtd: numero(row.max_qtd),
    obrigatorio: row.obrigatorio !== false,
    ordem: numero(row.ordem),
    opcoes,
  };
}

export function mapCombo(row: Row, itens: ComboItem[], grupos: ComboGrupo[] = []): Combo {
  return {
    id: textoOu(row.id),
    nome: textoOu(row.nome),
    descricao: texto(row.descricao),
    imagem_url: texto(row.imagem_url),
    preco: numero(row.preco),
    disponivel: row.disponivel !== false,
    destaque: booleano(row.destaque),
    ordem: numero(row.ordem),
    ativo: row.ativo !== false,
    created_at: textoOu(row.created_at),
    updated_at: textoOu(row.updated_at),
    itens,
    grupos,
  };
}

export function mapBanner(row: Row): Banner {
  return {
    id: textoOu(row.id),
    titulo: textoOu(row.titulo),
    subtitulo: texto(row.subtitulo),
    imagem_url: texto(row.imagem_url),
    link_url: texto(row.link_url),
    ordem: numero(row.ordem),
    ativo: row.ativo !== false,
    created_at: textoOu(row.created_at),
    updated_at: textoOu(row.updated_at),
  };
}

export function mapHorario(row: Row): Horario {
  return {
    id: textoOu(row.id),
    dia_semana: numero(row.dia_semana),
    sequencia: numero(row.sequencia),
    fechado: booleano(row.fechado),
    abre: texto(row.abre),
    fecha: texto(row.fecha),
    created_at: textoOu(row.created_at),
    updated_at: textoOu(row.updated_at),
  };
}

export function mapCupom(row: Row): Cupom {
  return {
    id: textoOu(row.id),
    codigo: textoOu(row.codigo),
    tipo: (texto(row.tipo) as Cupom["tipo"]) ?? "percentual",
    valor: numero(row.valor),
    pedido_minimo: numero(row.pedido_minimo),
    desconto_maximo: row.desconto_maximo == null ? null : numero(row.desconto_maximo),
    usos_maximos: row.usos_maximos == null ? null : numero(row.usos_maximos),
    usos: numero(row.usos),
    valido_de: texto(row.valido_de),
    valido_ate: texto(row.valido_ate),
    ativo: row.ativo !== false,
    created_at: textoOu(row.created_at),
    updated_at: textoOu(row.updated_at),
  };
}

function mapAdicionalItem(row: Row): ItemAdicional {
  return {
    id: textoOu(row.id),
    nome: textoOu(row.nome),
    preco: numero(row.preco),
  };
}

export function mapItemPedido(row: Row): ItemPedido {
  const adicionais = Array.isArray(row.adicionais) ? (row.adicionais as Row[]).map(mapAdicionalItem) : [];
  return {
    id: textoOu(row.id),
    pedido_id: textoOu(row.pedido_id),
    produto_id: texto(row.produto_id),
    combo_id: texto(row.combo_id),
    nome: textoOu(row.nome),
    preco_unitario: numero(row.preco_unitario),
    quantidade: numero(row.quantidade),
    adicionais,
    observacao: texto(row.observacao),
    created_at: textoOu(row.created_at),
  };
}

export function mapHistorico(row: Row): HistoricoPedido {
  return {
    id: textoOu(row.id),
    pedido_id: textoOu(row.pedido_id),
    status_anterior: texto(row.status_anterior) as StatusPedido | null,
    status_novo: (texto(row.status_novo) as StatusPedido) ?? "novo",
    observacao: texto(row.observacao),
    created_at: textoOu(row.created_at),
  };
}

export function mapPedido(
  row: Row,
  itens: ItemPedido[],
  historico: HistoricoPedido[] = [],
  pagamento: Pagamento | null = null,
): Pedido {
  return {
    id: textoOu(row.id),
    numero: numero(row.numero),
    cliente_nome: textoOu(row.cliente_nome),
    cliente_telefone: textoOu(row.cliente_telefone),
    cliente_email: texto(row.cliente_email),
    modalidade: (texto(row.modalidade) as Pedido["modalidade"]) ?? "delivery",
    cep: texto(row.cep),
    endereco: texto(row.endereco),
    numero_endereco: texto(row.numero_endereco),
    complemento: texto(row.complemento),
    bairro: texto(row.bairro),
    cidade: texto(row.cidade),
    referencia: texto(row.referencia),
    latitude: row.latitude == null ? null : numero(row.latitude),
    longitude: row.longitude == null ? null : numero(row.longitude),
    forma_pagamento: (texto(row.forma_pagamento) as Pedido["forma_pagamento"]) ?? "pix",
    troco_para: row.troco_para == null ? null : numero(row.troco_para),
    status: (texto(row.status) as StatusPedido) ?? "novo",
    status_pagamento: (texto(row.status_pagamento) as StatusPagamento) ?? "pendente",
    pagamento_provedor: (texto(row.pagamento_provedor) as Pedido["pagamento_provedor"]) ?? "manual",
    pagamento_online_tipo: (texto(row.pagamento_online_tipo) as Pedido["pagamento_online_tipo"]) ?? null,
    subtotal: numero(row.subtotal),
    taxa_entrega: numero(row.taxa_entrega),
    desconto: numero(row.desconto),
    total: numero(row.total),
    cupom_codigo: texto(row.cupom_codigo),
    observacoes: texto(row.observacoes),
    created_at: textoOu(row.created_at),
    updated_at: textoOu(row.updated_at),
    itens,
    historico,
    pagamento,
  };
}

export function mapPagamento(row: Row): Pagamento {
  return {
    id: textoOu(row.id),
    pedido_id: textoOu(row.pedido_id),
    provedor: "mercadopago",
    ambiente: (texto(row.ambiente) as Pagamento["ambiente"]) ?? "sandbox",
    tipo: (texto(row.tipo) as Pagamento["tipo"]) ?? "pix",
    status: (texto(row.status) as Pagamento["status"]) ?? "pendente",
    status_mp: texto(row.status_mp),
    metodo: texto(row.metodo),
    valor: numero(row.valor),
    moeda: textoOu(row.moeda, "BRL"),
    mp_order_id: texto(row.mp_order_id),
    mp_payment_id: texto(row.mp_payment_id),
    mp_preference_id: texto(row.mp_preference_id),
    mp_external_reference: textoOu(row.mp_external_reference),
    qr_code: texto(row.qr_code),
    qr_code_base64: texto(row.qr_code_base64),
    ticket_url: texto(row.ticket_url),
    init_point: texto(row.init_point),
    sandbox_init_point: texto(row.sandbox_init_point),
    ultimo_erro: texto(row.ultimo_erro),
    aprovado_em: texto(row.aprovado_em),
    expirado_em: texto(row.expirado_em),
    sincronizado_em: texto(row.sincronizado_em),
    created_at: textoOu(row.created_at),
    updated_at: textoOu(row.updated_at),
  };
}

export function mapEventoPagamento(row: Row): EventoPagamento {
  return {
    id: textoOu(row.id),
    pagamento_id: texto(row.pagamento_id),
    pedido_id: texto(row.pedido_id),
    origem: (texto(row.origem) as EventoPagamento["origem"]) ?? "sincronizacao",
    evento: textoOu(row.evento),
    status_anterior: texto(row.status_anterior),
    status_novo: texto(row.status_novo),
    detalhe: row.detalhe && typeof row.detalhe === "object" ? (row.detalhe as Record<string, unknown>) : {},
    created_at: textoOu(row.created_at),
  };
}

export function mapConfiguracaoPagamento(row: Row): ConfiguracaoPagamento {
  return {
    id: numero(row.id),
    mercadopago_ativo: row.mercadopago_ativo === true,
    pix_online_ativo: row.pix_online_ativo === true,
    cartao_online_ativo: row.cartao_online_ativo === true,
    ultimo_teste_ok: row.ultimo_teste_ok === true,
    ultimo_teste_em: texto(row.ultimo_teste_em),
    ultimo_teste_ambiente: texto(row.ultimo_teste_ambiente),
    ultimo_teste_mensagem: texto(row.ultimo_teste_mensagem),
    created_at: textoOu(row.created_at),
    updated_at: textoOu(row.updated_at),
  };
}

export function mapImpressora(row: Row): Impressora {
  const largura = numero(row.largura_mm);
  return {
    id: textoOu(row.id),
    nome: textoOu(row.nome),
    setor: textoOu(row.setor, "principal"),
    largura_mm: largura === 58 ? 58 : 80,
    ativo: row.ativo !== false,
    ultimo_ping_em: texto(row.ultimo_ping_em),
    ultimo_info: row.ultimo_info && typeof row.ultimo_info === "object" ? (row.ultimo_info as Record<string, unknown>) : {},
    created_at: textoOu(row.created_at),
    updated_at: textoOu(row.updated_at),
  };
}

export function mapTrabalhoImpressao(row: Row): TrabalhoImpressao {
  const largura = numero(row.largura_mm);
  return {
    id: textoOu(row.id),
    pedido_id: texto(row.pedido_id),
    impressora_id: texto(row.impressora_id),
    tipo: (texto(row.tipo) as TrabalhoImpressao["tipo"]) ?? "pedido",
    setor: textoOu(row.setor, "principal"),
    job_key: textoOu(row.job_key),
    status: (texto(row.status) as StatusImpressao) ?? "pendente",
    largura_mm: largura === 58 || largura === 80 ? largura : null,
    payload: row.payload && typeof row.payload === "object" ? (row.payload as Record<string, unknown>) : {},
    tentativas: numero(row.tentativas),
    erro: texto(row.erro),
    reimpressao: row.reimpressao === true,
    solicitado_por: texto(row.solicitado_por),
    created_at: textoOu(row.created_at),
    processing_at: texto(row.processing_at),
    completed_at: texto(row.completed_at),
    pedido_numero: row.pedido_numero == null ? null : numero(row.pedido_numero),
    impressora_nome: texto(row.impressora_nome),
  };
}

export function mapAvaliacao(row: Row): Avaliacao {
  return {
    id: textoOu(row.id),
    pedido_id: textoOu(row.pedido_id),
    cliente_nome: texto(row.cliente_nome),
    nota: numero(row.nota),
    comentario: texto(row.comentario),
    aprovado: booleano(row.aprovado),
    created_at: textoOu(row.created_at),
    updated_at: textoOu(row.updated_at),
  };
}

export function mapPerfil(row: Row): Perfil {
  return {
    id: textoOu(row.id),
    nome: texto(row.nome),
    papel: (texto(row.papel) as Perfil["papel"]) ?? "cliente",
    updated_at: textoOu(row.updated_at),
  };
}

export function agruparPor<T, K extends string>(lista: T[], chave: (item: T) => K): Map<K, T[]> {
  const mapa = new Map<K, T[]>();
  for (const item of lista) {
    const k = chave(item);
    const grupo = mapa.get(k);
    if (grupo) grupo.push(item);
    else mapa.set(k, [item]);
  }
  return mapa;
}

export { mapAdicionalItem };


import { numero } from "./format";
import type {
  Adicional,
  Avaliacao,
  Banner,
  Categoria,
  Combo,
  ComboItem,
  Configuracoes,
  Cupom,
  HistoricoPedido,
  Horario,
  ItemAdicional,
  ItemPedido,
  Pedido,
  Perfil,
  Produto,
  StatusPedido,
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

export function mapCombo(row: Row, itens: ComboItem[]): Combo {
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

export function mapPedido(row: Row, itens: ItemPedido[], historico: HistoricoPedido[] = []): Pedido {
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
    forma_pagamento: (texto(row.forma_pagamento) as Pedido["forma_pagamento"]) ?? "pix",
    troco_para: row.troco_para == null ? null : numero(row.troco_para),
    status: (texto(row.status) as StatusPedido) ?? "novo",
    status_pagamento: (texto(row.status_pagamento) as Pedido["status_pagamento"]) ?? "pendente",
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


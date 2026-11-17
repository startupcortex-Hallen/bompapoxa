export type StatusPedido =
  | "novo"
  | "em_preparo"
  | "pronto"
  | "saiu_entrega"
  | "entregue"
  | "retirado"
  | "cancelado";

export type Modalidade = "delivery" | "retirada";
export type FormaPagamento = "pix" | "dinheiro" | "cartao";
export type StatusPagamento = "pendente" | "pago" | "cancelado";
export type TipoCupom = "percentual" | "valor_fixo";
export type Papel = "admin" | "cliente";

export type Configuracoes = {
  id: number;
  nome_estabelecimento: string;
  descricao: string | null;
  logo_url: string | null;
  banner_url: string | null;
  instagram_url: string | null;
  whatsapp: string | null;
  telefone: string | null;
  email: string | null;
  endereco: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  mapa_url: string | null;
  cor_primaria: string;
  cor_secundaria: string;
  cor_destaque: string;
  cor_fundo: string;
  cor_texto: string;
  tipografia: string;
  aceita_delivery: boolean;
  aceita_retirada: boolean;
  taxa_entrega: number;
  frete_gratis_acima_de: number | null;
  pedido_minimo: number;
  tempo_entrega_min: number;
  tempo_retirada_min: number;
  status_abertura: "automatico" | "aberto" | "fechado";
  aceitando_pedidos: boolean;
  formas_pagamento: string[];
  mensagem_boas_vindas: string | null;
  rodape: string | null;
  updated_at: string;
};

export type Categoria = {
  id: string;
  nome: string;
  descricao: string | null;
  imagem_url: string | null;
  ordem: number;
  ativo: boolean;
  destaque: boolean;
  created_at: string;
  updated_at: string;
};

export type Adicional = {
  id: string;
  produto_id: string;
  nome: string;
  descricao: string | null;
  preco: number;
  imagem_url: string | null;
  grupo: string;
  obrigatorio: boolean;
  min_qtd: number;
  max_qtd: number;
  disponivel: boolean;
  ordem: number;
  created_at: string;
  updated_at: string;
};

export type Produto = {
  id: string;
  categoria_id: string;
  nome: string;
  descricao: string | null;
  preco: number;
  preco_promocional: number | null;
  imagem_url: string | null;
  galeria: string[];
  ingredientes: string[];
  disponivel: boolean;
  destaque: boolean;
  tempo_preparo_min: number | null;
  ordem: number;
  ativo: boolean;
  min_adicionais: number;
  max_adicionais: number;
  created_at: string;
  updated_at: string;
  adicionais: Adicional[];
};

export type ComboItem = {
  id: string;
  combo_id: string;
  produto_id: string;
  quantidade: number;
  produto_nome?: string;
};

export type ComboOpcao = {
  id: string;
  grupo_id: string;
  produto_id: string;
  produto_nome?: string;
  produto_disponivel?: boolean;
  quantidade: number;
  rotulo: string | null;
  ordem: number;
};

export type ComboGrupo = {
  id: string;
  combo_id: string;
  nome: string;
  min_qtd: number;
  max_qtd: number;
  obrigatorio: boolean;
  ordem: number;
  opcoes: ComboOpcao[];
};

export type Combo = {
  id: string;
  nome: string;
  descricao: string | null;
  imagem_url: string | null;
  preco: number;
  disponivel: boolean;
  destaque: boolean;
  ordem: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  itens: ComboItem[];
  grupos: ComboGrupo[];
};

export type Banner = {
  id: string;
  titulo: string;
  subtitulo: string | null;
  imagem_url: string | null;
  link_url: string | null;
  ordem: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
};

export type Horario = {
  id: string;
  dia_semana: number;
  sequencia: number;
  fechado: boolean;
  abre: string | null;
  fecha: string | null;
  created_at: string;
  updated_at: string;
};

export type Cupom = {
  id: string;
  codigo: string;
  tipo: TipoCupom;
  valor: number;
  pedido_minimo: number;
  desconto_maximo: number | null;
  usos_maximos: number | null;
  usos: number;
  valido_de: string | null;
  valido_ate: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
};

export type ItemAdicional = {
  id: string;
  nome: string;
  preco: number;
};

export type ItemPedido = {
  id: string;
  pedido_id: string;
  produto_id: string | null;
  combo_id: string | null;
  nome: string;
  preco_unitario: number;
  quantidade: number;
  adicionais: ItemAdicional[];
  observacao: string | null;
  created_at: string;
};

export type HistoricoPedido = {
  id: string;
  pedido_id: string;
  status_anterior: StatusPedido | null;
  status_novo: StatusPedido;
  observacao: string | null;
  created_at: string;
};

export type EnderecoPedido = {
  cep: string | null;
  endereco: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  referencia: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

export type Pedido = {
  id: string;
  numero: number;
  cliente_nome: string;
  cliente_telefone: string;
  cliente_email: string | null;
  modalidade: Modalidade;
  cep: string | null;
  endereco: string | null;
  numero_endereco: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  referencia: string | null;
  latitude: number | null;
  longitude: number | null;
  forma_pagamento: FormaPagamento;
  troco_para: number | null;
  status: StatusPedido;
  status_pagamento: StatusPagamento;
  subtotal: number;
  taxa_entrega: number;
  desconto: number;
  total: number;
  cupom_codigo: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
  itens: ItemPedido[];
  historico?: HistoricoPedido[];
};

export type Avaliacao = {
  id: string;
  pedido_id: string;
  cliente_nome: string | null;
  nota: number;
  comentario: string | null;
  aprovado: boolean;
  created_at: string;
  updated_at: string;
};

export type Perfil = {
  id: string;
  nome: string | null;
  papel: Papel;
  updated_at: string;
};

export type CardapioPublico = {
  configuracoes: Configuracoes;
  categorias: Categoria[];
  produtos: Produto[];
  combos: Combo[];
  banners: Banner[];
  horarios: Horario[];
  avaliacoes: Avaliacao[];
  aberto: boolean;
};

export type StatusPedidoRastreio = Pedido & {
  avaliacao?: { nota: number; comentario: string | null; aprovado: boolean } | null;
};

export type ResultadoPedido = {
  pedido_id: string;
  numero: number;
  tracking_token: string;
  subtotal: number;
  taxa_entrega: number;
  desconto: number;
  total: number;
};


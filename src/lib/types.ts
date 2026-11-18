export type StatusPedido =
  | "novo"
  | "em_preparo"
  | "pronto"
  | "saiu_entrega"
  | "entregue"
  | "retirado"
  | "cancelado";

export type PagamentoProvedor = "manual" | "mercadopago";
export type PagamentoTipo = "pix" | "cartao";
export type PagamentoStatus =
  | "pendente"
  | "em_processamento"
  | "aprovado"
  | "recusado"
  | "cancelado"
  | "expirado"
  | "estornado"
  | "erro";

export type Pagamento = {
  id: string;
  pedido_id: string;
  provedor: "mercadopago";
  ambiente: "sandbox" | "producao";
  tipo: PagamentoTipo;
  status: PagamentoStatus;
  status_mp: string | null;
  metodo: string | null;
  valor: number;
  moeda: string;
  mp_order_id: string | null;
  mp_payment_id: string | null;
  mp_preference_id: string | null;
  mp_external_reference: string;
  qr_code: string | null;
  qr_code_base64: string | null;
  ticket_url: string | null;
  init_point: string | null;
  sandbox_init_point: string | null;
  ultimo_erro: string | null;
  aprovado_em: string | null;
  expirado_em: string | null;
  sincronizado_em: string | null;
  created_at: string;
  updated_at: string;
};

export type PagamentoPublico = {
  mercadopago_ativo: boolean;
  pix_online: boolean;
  cartao_online: boolean;
};

export type ResultadoPagamentoOnline = {
  ok: boolean;
  jaPago?: boolean;
  reutilizado?: boolean;
  cache?: boolean;
  tipo: PagamentoTipo;
  status: PagamentoStatus;
  checkoutUrl?: string | null;
  pagamento: Pagamento | null;
  mensagem?: string;
};

export type StatusIntegracaoPagamento =
  | "nao_configurado"
  | "aguardando_credenciais"
  | "configurado_sandbox"
  | "configurado_producao"
  | "testes_aprovados"
  | "pronto_para_producao"
  | "producao_ativa";

export type StatusIntegracaoMercadoPago = {
  ok: boolean;
  status: StatusIntegracaoPagamento;
  ambiente: "sandbox" | "producao";
  configurado: boolean;
  accessTokenConfigurado: boolean;
  publicKeyConfigurado: boolean;
  webhookSecretConfigurado: boolean;
  faltando: string[];
  webhookUrl: string;
  appUrl: string;
  ativo: boolean;
  pixOnline: boolean;
  cartaoOnline: boolean;
  ultimoTesteOk: boolean;
  ultimoTesteEm: string | null;
  ultimoTesteAmbiente: string | null;
  ultimoTesteMensagem: string | null;
  comunicacao?: { ok: boolean; mensagem: string } | null;
  prontoParaProducao: boolean;
};

export type StatusImpressao = "pendente" | "processando" | "impresso" | "erro" | "cancelado";

export type Impressora = {
  id: string;
  nome: string;
  setor: string;
  largura_mm: 58 | 80;
  ativo: boolean;
  ultimo_ping_em: string | null;
  ultimo_info: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type TrabalhoImpressao = {
  id: string;
  pedido_id: string | null;
  impressora_id: string | null;
  tipo: "pedido" | "teste";
  setor: string;
  job_key: string;
  status: StatusImpressao;
  largura_mm: 58 | 80 | null;
  payload: Record<string, unknown>;
  tentativas: number;
  erro: string | null;
  reimpressao: boolean;
  solicitado_por: string | null;
  created_at: string;
  processing_at: string | null;
  completed_at: string | null;
  pedido_numero?: number | null;
  impressora_nome?: string | null;
};

export type EventoPagamento = {
  id: string;
  pagamento_id: string | null;
  pedido_id: string | null;
  origem: "criacao" | "webhook" | "sincronizacao" | "admin" | "teste";
  evento: string;
  status_anterior: string | null;
  status_novo: string | null;
  detalhe: Record<string, unknown>;
  created_at: string;
};

export type ConfiguracaoPagamento = {
  id: number;
  mercadopago_ativo: boolean;
  pix_online_ativo: boolean;
  cartao_online_ativo: boolean;
  ultimo_teste_ok: boolean;
  ultimo_teste_em: string | null;
  ultimo_teste_ambiente: string | null;
  ultimo_teste_mensagem: string | null;
  created_at: string;
  updated_at: string;
};

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
  pagamento_provedor: PagamentoProvedor;
  pagamento_online_tipo: PagamentoTipo | null;
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
  pagamento?: Pagamento | null;
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


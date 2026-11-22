import type {
  PagamentoProvedor,
  PagamentoStatus,
  PagamentoTipo,
  StatusImpressao,
  StatusIntegracaoPagamento,
} from "./types";

export const PAGAMENTO_STATUS_LABEL: Record<PagamentoStatus, string> = {
  pendente: "Aguardando pagamento",
  em_processamento: "Em processamento",
  aprovado: "Pagamento aprovado",
  recusado: "Pagamento recusado",
  cancelado: "Pagamento cancelado",
  expirado: "Pagamento expirado",
  estornado: "Pagamento estornado",
  erro: "Erro na comunicação",
};

export const PAGAMENTO_STATUS_DESCRICAO: Record<PagamentoStatus, string> = {
  pendente: "O pagamento ainda não foi confirmado pela InfinitePay.",
  em_processamento: "A InfinitePay está processando a transação.",
  aprovado: "Pagamento confirmado pela InfinitePay.",
  recusado: "O pagamento foi recusado. O pedido continua registrado.",
  cancelado: "O pagamento foi cancelado no checkout.",
  expirado: "O prazo do checkout expirou. Gere um novo link.",
  estornado: "O valor foi estornado pela InfinitePay.",
  erro: "Não foi possível confirmar o pagamento com a InfinitePay.",
};

export const PAGAMENTO_TIPO_LABEL: Record<PagamentoTipo, string> = {
  online: "Checkout online",
  pix: "PIX online",
  cartao: "Cartão online",
};

export const PAGAMENTO_PROVEDOR_LABEL: Record<PagamentoProvedor, string> = {
  manual: "Manual",
  infinitepay: "InfinitePay",
};

export function pagamentoStatusCor(
  status: PagamentoStatus,
): "success" | "danger" | "accent" | "neutral" | "primary" {
  if (status === "aprovado") return "success";
  if (status === "recusado" || status === "cancelado" || status === "expirado" || status === "estornado" || status === "erro") {
    return "danger";
  }
  if (status === "em_processamento") return "primary";
  return "accent";
}

export function pagamentoPodeTentarNovamente(status: PagamentoStatus): boolean {
  return ["pendente", "recusado", "cancelado", "expirado", "erro", "estornado"].includes(status);
}

export function metodoPagamentoLabel(forma: string, provedor?: PagamentoProvedor | null, tipo?: PagamentoTipo | null): string {
  if (provedor === "infinitepay") {
    if (tipo === "pix") return "PIX online (InfinitePay)";
    if (tipo === "cartao") return "Cartão online (InfinitePay)";
    return "Pagamento online (InfinitePay)";
  }
  if (forma === "pix") return "PIX manual";
  if (forma === "dinheiro") return "Dinheiro";
  if (forma === "cartao") return "Cartão na máquina";
  return forma;
}

export const STATUS_INTEGRACAO_LABEL: Record<StatusIntegracaoPagamento, string> = {
  nao_configurado: "Não configurado",
  aguardando_credenciais: "Aguardando credenciais",
  configurado: "Configurado",
  testes_aprovados: "API acessível",
  producao_ativa: "Produção ativa",
};

export const STATUS_IMPRESSAO_LABEL: Record<StatusImpressao, string> = {
  pendente: "Pendente",
  processando: "Processando",
  impresso: "Impresso",
  erro: "Erro",
  cancelado: "Cancelado",
};

export function impressoraOnline(ultimoPingEm: string | null | undefined, agora = Date.now()): boolean {
  if (!ultimoPingEm) return false;
  const ping = new Date(ultimoPingEm).getTime();
  if (!Number.isFinite(ping)) return false;
  return agora - ping < 90_000;
}

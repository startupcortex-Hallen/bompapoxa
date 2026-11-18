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
  pendente: "O pagamento ainda não foi identificado pelo Mercado Pago.",
  em_processamento: "O Mercado Pago está processando a transação.",
  aprovado: "Pagamento confirmado pelo Mercado Pago.",
  recusado: "O pagamento foi recusado. O pedido continua registrado.",
  cancelado: "O pagamento foi cancelado.",
  expirado: "O prazo do pagamento expirou.",
  estornado: "O valor foi estornado.",
  erro: "Não foi possível confirmar o pagamento com o Mercado Pago.",
};

export const PAGAMENTO_TIPO_LABEL: Record<PagamentoTipo, string> = {
  pix: "PIX online",
  cartao: "Cartão online",
};

export const PAGAMENTO_PROVEDOR_LABEL: Record<PagamentoProvedor, string> = {
  manual: "Manual",
  mercadopago: "Mercado Pago",
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
  if (provedor === "mercadopago") {
    if (tipo === "pix" || forma === "pix") return "PIX online (Mercado Pago)";
    if (tipo === "cartao" || forma === "cartao") return "Cartão online (Mercado Pago)";
  }
  if (forma === "pix") return "PIX manual";
  if (forma === "dinheiro") return "Dinheiro";
  if (forma === "cartao") return "Cartão na máquina";
  return forma;
}

export const STATUS_INTEGRACAO_LABEL: Record<StatusIntegracaoPagamento, string> = {
  nao_configurado: "Não configurado",
  aguardando_credenciais: "Aguardando credenciais",
  configurado_sandbox: "Configurado em Sandbox",
  configurado_producao: "Configurado em produção",
  testes_aprovados: "Testes aprovados",
  pronto_para_producao: "Pronto para produção",
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

import { Badge } from "@/components/ui/feedback";
import { STATUS_LABEL, STATUS_PAGAMENTO_LABEL } from "@/lib/order-status";
import type { StatusPagamento, StatusPedido } from "@/lib/types";

const CORES: Record<StatusPedido, "primary" | "accent" | "success" | "danger" | "neutral"> = {
  novo: "primary",
  em_preparo: "accent",
  pronto: "success",
  saiu_entrega: "accent",
  entregue: "success",
  retirado: "success",
  cancelado: "danger",
};

export function StatusPedidoBadge({ status }: { status: StatusPedido }) {
  return <Badge cor={CORES[status]}>{STATUS_LABEL[status]}</Badge>;
}

export function StatusPagamentoBadge({ status }: { status: StatusPagamento }) {
  return (
    <Badge cor={status === "pago" ? "success" : status === "cancelado" ? "danger" : "neutral"}>
      {STATUS_PAGAMENTO_LABEL[status] ?? status}
    </Badge>
  );
}

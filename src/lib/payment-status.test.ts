import { describe, expect, it } from "vitest";
import {
  impressoraOnline,
  metodoPagamentoLabel,
  PAGAMENTO_STATUS_LABEL,
  pagamentoPodeTentarNovamente,
  pagamentoStatusCor,
  STATUS_IMPRESSAO_LABEL,
  STATUS_INTEGRACAO_LABEL,
} from "./payment-status";

describe("status de pagamento online", () => {
  it("traduz todos os estados previstos", () => {
    expect(PAGAMENTO_STATUS_LABEL.pendente).toBe("Aguardando pagamento");
    expect(PAGAMENTO_STATUS_LABEL.em_processamento).toBe("Em processamento");
    expect(PAGAMENTO_STATUS_LABEL.aprovado).toBe("Pagamento aprovado");
    expect(PAGAMENTO_STATUS_LABEL.recusado).toBe("Pagamento recusado");
    expect(PAGAMENTO_STATUS_LABEL.cancelado).toBe("Pagamento cancelado");
    expect(PAGAMENTO_STATUS_LABEL.expirado).toBe("Pagamento expirado");
    expect(PAGAMENTO_STATUS_LABEL.erro).toBe("Erro na comunicação");
  });

  it("define cores e tentativas de acordo com o estado", () => {
    expect(pagamentoStatusCor("aprovado")).toBe("success");
    expect(pagamentoStatusCor("pendente")).toBe("accent");
    expect(pagamentoStatusCor("recusado")).toBe("danger");
    expect(pagamentoPodeTentarNovamente("erro")).toBe(true);
    expect(pagamentoPodeTentarNovamente("aprovado")).toBe(false);
  });

  it("diferencia PIX manual de pagamento online e cartão de máquina", () => {
    expect(metodoPagamentoLabel("pix", "manual")).toBe("PIX manual");
    expect(metodoPagamentoLabel("pix", "infinitepay", "pix")).toBe("PIX online (InfinitePay)");
    expect(metodoPagamentoLabel("cartao", "infinitepay", "cartao")).toBe("Cartão online (InfinitePay)");
    expect(metodoPagamentoLabel("cartao", "infinitepay", "online")).toBe("Pagamento online (InfinitePay)");
    expect(metodoPagamentoLabel("cartao", "manual")).toBe("Cartão na máquina");
  });

  it("cobre estados da integração e da impressão", () => {
    expect(STATUS_INTEGRACAO_LABEL.nao_configurado).toBe("Não configurado");
    expect(STATUS_INTEGRACAO_LABEL.producao_ativa).toBe("Produção ativa");
    expect(STATUS_IMPRESSAO_LABEL.impresso).toBe("Impresso");
    expect(STATUS_IMPRESSAO_LABEL.erro).toBe("Erro");
  });

  it("considera impressora online por 90 segundos", () => {
    const agora = new Date("2026-11-18T12:00:00.000Z").getTime();
    expect(impressoraOnline("2026-11-18T11:59:30.000Z", agora)).toBe(true);
    expect(impressoraOnline("2026-11-18T11:58:00.000Z", agora)).toBe(false);
    expect(impressoraOnline(null, agora)).toBe(false);
  });
});

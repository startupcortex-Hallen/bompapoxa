const FORMA_LABEL = {
  pix: "PIX",
  dinheiro: "Dinheiro",
  cartao: "Cartão",
};

const STATUS_PAGAMENTO_LABEL = {
  pendente: "PENDENTE",
  pago: "PAGO",
  cancelado: "CANCELADO",
};

const STATUS_ONLINE_LABEL = {
  pendente: "AGUARDANDO PAGAMENTO",
  em_processamento: "EM PROCESSAMENTO",
  aprovado: "APROVADO",
  recusado: "RECUSADO",
  cancelado: "CANCELADO",
  expirado: "EXPIRADO",
  estornado: "ESTORNADO",
  erro: "ERRO NA COMUNICAÇÃO",
};

const MOEDA = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
});

const DATA = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Bahia",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const HORA = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Bahia",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function larguraColunas(printerWidthMm) {
  return Number(printerWidthMm) === 58 ? 32 : 48;
}

function texto(valor) {
  return valor === null || valor === undefined ? "" : String(valor);
}

function dinheiro(valor) {
  return MOEDA.format(Number(valor ?? 0));
}

function dataHora(iso) {
  const d = iso ? new Date(iso) : new Date();
  if (Number.isNaN(d.getTime())) return { data: "—", hora: "—" };
  return { data: DATA.format(d), hora: HORA.format(d) };
}

function quebrar(textoBruto, largura) {
  const linhas = [];
  const blocos = texto(textoBruto).replace(/\r\n/g, "\n").split("\n");
  for (const bloco of blocos) {
    const palavras = bloco.split(/\s+/).filter(Boolean);
    if (!palavras.length) {
      linhas.push("");
      continue;
    }
    let atual = "";
    for (const palavra of palavras) {
      if (palavra.length > largura) {
        if (atual) {
          linhas.push(atual);
          atual = "";
        }
        for (let i = 0; i < palavra.length; i += largura) linhas.push(palavra.slice(i, i + largura));
        continue;
      }
      const candidato = atual ? `${atual} ${palavra}` : palavra;
      if (candidato.length <= largura) atual = candidato;
      else {
        if (atual) linhas.push(atual);
        atual = palavra;
      }
    }
    if (atual) linhas.push(atual);
  }
  return linhas;
}

function centralizar(valor, largura) {
  const t = texto(valor).slice(0, largura);
  const espacos = Math.max(0, Math.floor((largura - t.length) / 2));
  return `${" ".repeat(espacos)}${t}`;
}

function linhaDupla(rotulo, valor, largura) {
  const r = texto(rotulo);
  const v = texto(valor);
  const espacos = Math.max(1, largura - r.length - v.length);
  return `${r}${" ".repeat(espacos)}${v}`;
}

export function formaPagamentoLabel(payload) {
  const forma = texto(payload?.forma_pagamento);
  const provedor = texto(payload?.pagamento_provedor);
  const onlineTipo = texto(payload?.pagamento_online_tipo);
  if (provedor === "mercadopago") {
    if (onlineTipo === "pix" || forma === "pix") return "PIX ONLINE (MERCADO PAGO)";
    if (onlineTipo === "cartao" || forma === "cartao") return "CARTÃO ONLINE (MERCADO PAGO)";
  }
  if (forma === "pix") return "PIX MANUAL";
  if (forma === "dinheiro") return "DINHEIRO";
  if (forma === "cartao") return "CARTÃO NA MÁQUINA";
  return FORMA_LABEL[forma] ?? forma.toUpperCase();
}

export function situacaoPagamentoLabel(payload) {
  const statusOnline = texto(payload?.pagamento_online?.status);
  const statusPedido = texto(payload?.pagamento_status);
  if (statusPedido === "pago" || statusOnline === "aprovado") return "PAGO";
  if (statusPedido === "cancelado") return "CANCELADO";
  if (statusOnline) return STATUS_ONLINE_LABEL[statusOnline] ?? statusOnline.toUpperCase();
  return STATUS_PAGAMENTO_LABEL[statusPedido] ?? statusPedido.toUpperCase();
}

function itemLinhas(item, largura) {
  const linhas = [];
  const quantidade = Number(item?.quantidade ?? 0);
  linhas.push(...quebrar(`${quantidade}x ${texto(item?.nome).toUpperCase()}`, largura));

  const adicionais = Array.isArray(item?.adicionais) ? item.adicionais : [];
  if (adicionais.length) {
    linhas.push("Adicionais:");
    for (const adicional of adicionais) {
      linhas.push(...quebrar(`- ${texto(adicional?.nome)}`, largura));
    }
  }

  let observacao = texto(item?.observacao).trim();
  if (observacao.startsWith("Inclui:")) {
    const partes = observacao.split("|");
    const escolhas = partes.shift()?.replace(/^Inclui:\s*/i, "").trim() ?? "";
    if (escolhas) {
      linhas.push("Inclui:");
      for (const escolha of escolhas.split(",").map((e) => e.trim()).filter(Boolean)) {
        linhas.push(...quebrar(`- ${escolha}`, largura));
      }
    }
    observacao = partes.join("|").trim();
  }
  if (observacao) {
    linhas.push("Observação do item:");
    linhas.push(...quebrar(observacao, largura));
  }
  return linhas;
}

export function formatTicket(payload, printerWidthMm = 80) {
  const largura = larguraColunas(printerWidthMm);
  const sep = "-".repeat(largura);
  const estabelecimento = texto(payload?.estabelecimento?.nome) || "BOM PA POXA";
  const linhas = [];

  const push = (...vals) => {
    for (const valor of vals) linhas.push(...quebrar(valor, largura));
  };

  if (payload?.teste) {
    linhas.push(centralizar(estabelecimento.toUpperCase(), largura));
    linhas.push(centralizar("TESTE DE IMPRESSÃO", largura));
    linhas.push("");
    const { data, hora } = dataHora(payload?.gerado_em);
    linhas.push(linhaDupla("DATA:", data, largura));
    linhas.push(linhaDupla("HORA:", hora, largura));
    linhas.push(sep);
    push("Se você está lendo este cupom, a ponte local de impressão está funcionando.");
    linhas.push("");
    linhas.push(centralizar("BOM PA POXA", largura));
    linhas.push(centralizar("Bom trabalho!", largura));
    linhas.push("");
    linhas.push("");
    return linhas.join("\n");
  }

  const { data, hora } = dataHora(payload?.criado_em);

  linhas.push(centralizar(estabelecimento.toUpperCase(), largura));
  linhas.push(centralizar(`PEDIDO Nº ${payload?.numero ?? "—"}`, largura));
  linhas.push("");
  linhas.push(linhaDupla("DATA:", data, largura));
  linhas.push(linhaDupla("HORA:", hora, largura));
  linhas.push(sep);
  linhas.push("");
  linhas.push("CLIENTE:");
  push(payload?.cliente_nome || "—");
  linhas.push("");
  linhas.push("TELEFONE:");
  push(payload?.cliente_telefone || "—");
  linhas.push("");
  linhas.push("MODALIDADE:");
  linhas.push(payload?.modalidade === "retirada" ? "RETIRADA" : "ENTREGA");
  linhas.push(sep);
  linhas.push("");
  linhas.push("ITENS DO PEDIDO");
  linhas.push("");

  const itens = Array.isArray(payload?.itens) ? payload.itens : [];
  if (!itens.length) {
    linhas.push("Nenhum item no snapshot.");
  } else {
    for (const item of itens) {
      linhas.push(...itemLinhas(item, largura));
      linhas.push("");
    }
  }

  linhas.push(sep);
  linhas.push("OBSERVAÇÕES GERAIS:");
  const observacoes = texto(payload?.observacoes).trim();
  push(observacoes || "Nenhuma observação.");
  linhas.push(sep);
  linhas.push("");

  if (payload?.modalidade === "retirada") {
    linhas.push("RETIRADA NO ESTABELECIMENTO");
    const enderecoLoja = [
      payload?.estabelecimento?.endereco,
      payload?.estabelecimento?.bairro,
      payload?.estabelecimento?.cidade,
    ].filter(Boolean);
    if (enderecoLoja.length) push(enderecoLoja.join(", "));
    linhas.push("");
  } else {
    linhas.push("ENDEREÇO DE ENTREGA:");
    const endereco = payload?.endereco ?? {};
    push(endereco.endereco || "Endereço não informado.");
    if (endereco.numero) linhas.push(`Número: ${endereco.numero}`);
    if (endereco.complemento) linhas.push(`Complemento: ${endereco.complemento}`);
    if (endereco.bairro) linhas.push(`Bairro: ${endereco.bairro}`);
    if (endereco.cidade) linhas.push(`Cidade: ${endereco.cidade}`);
    if (endereco.cep) linhas.push(`CEP: ${endereco.cep}`);
    if (endereco.referencia) push(`Referência: ${endereco.referencia}`);
    linhas.push("");
  }

  linhas.push(sep);
  linhas.push("PAGAMENTO:");
  push(formaPagamentoLabel(payload));
  linhas.push("Situação:");
  linhas.push(situacaoPagamentoLabel(payload));
  if (payload?.troco_para !== null && payload?.troco_para !== undefined) {
    linhas.push(linhaDupla("Troco para:", dinheiro(payload.troco_para), largura));
  }
  linhas.push(sep);
  linhas.push("");
  linhas.push("RESUMO FINANCEIRO");
  linhas.push(linhaDupla("Subtotal:", dinheiro(payload?.subtotal), largura));
  if (Number(payload?.desconto ?? 0) > 0) {
    linhas.push(linhaDupla("Desconto:", `- ${dinheiro(payload.desconto)}`, largura));
  }
  linhas.push(linhaDupla("Taxa de entrega:", dinheiro(payload?.taxa_entrega), largura));
  linhas.push(linhaDupla("TOTAL DO PEDIDO:", dinheiro(payload?.total), largura));
  linhas.push(sep);
  linhas.push("");
  linhas.push("INFORMAÇÕES IMPORTANTES");

  if (payload?.modalidade === "retirada") {
    linhas.push(centralizar("*** RETIRADA ***", largura));
  } else {
    linhas.push(centralizar("*** ENTREGA ***", largura));
  }

  const pago = texto(payload?.pagamento_status) === "pago" || texto(payload?.pagamento_online?.status) === "aprovado";
  if (!pago) {
    linhas.push(centralizar("*** PAGAMENTO PENDENTE ***", largura));
  }
  if (payload?.cupom_codigo) linhas.push(`Cupom: ${payload.cupom_codigo}`);
  linhas.push("");
  linhas.push(centralizar("OBRIGADO PELO PEDIDO!", largura));
  linhas.push("");
  linhas.push("");
  return linhas.join("\n");
}

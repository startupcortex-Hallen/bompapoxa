import { erro, json, lerJson, preflight } from "../_shared/http.mjs";
import { requireAdmin } from "../_shared/supabase-admin.mjs";
import {
  getInfinitepayConfig,
  missingInfinitepaySecrets,
  pingApi,
} from "../_shared/infinitepay-api.mjs";
import { safeErrorMessage } from "../_shared/infinitepay-core.mjs";

type DbConfig = {
  infinitepay_ativo?: boolean;
  ultimo_teste_ok?: boolean;
} | null;

function calcularStatus({
  db,
  faltando,
}: {
  db: DbConfig;
  faltando: string[];
}) {
  if (faltando.length >= 2) return "nao_configurado";
  if (faltando.length > 0) return "aguardando_credenciais";
  if (db?.ultimo_teste_ok) return db?.infinitepay_ativo ? "producao_ativa" : "testes_aprovados";
  return "configurado";
}

Deno.serve(async (req) => {
  const cors = preflight(req);
  if (cors) return cors;
  if (req.method !== "POST" && req.method !== "GET") return erro("Método não permitido.", 405);

  try {
    const { admin } = await requireAdmin(req);
    let body: { check?: boolean } = {};
    if (req.method === "POST") {
      try {
        body = (await lerJson(req)) as { check?: boolean };
      } catch {
        body = {};
      }
    }

    const { data: db, error: dbError } = await admin
      .from("cardapio_exemplo_pagamento_config")
      .select("*")
      .eq("id", 1)
      .maybeSingle();
    if (dbError) throw new Error("Configuração de pagamentos indisponível. Aplique a migration nova.");

    const config = getInfinitepayConfig();
    const faltando = missingInfinitepaySecrets(config);
    let comunicacao = null;
    let dbAtual = db;

    if (body?.check) {
      if (faltando.length) {
        comunicacao = { ok: false, mensagem: `Credenciais ausentes: ${faltando.join(", ")}.` };
      } else {
        try {
          await pingApi();
          const agora = new Date().toISOString();
          const { data: atualizado, error: updateError } = await admin
            .from("cardapio_exemplo_pagamento_config")
            .update({
              ultimo_teste_ok: true,
              ultimo_teste_em: agora,
              ultimo_teste_ambiente: "producao",
              ultimo_teste_mensagem:
                "API do Checkout Integrado acessível. A confirmação das credenciais ocorre na primeira cobrança.",
            })
            .eq("id", 1)
            .select("*")
            .single();
          if (updateError) throw updateError;
          dbAtual = atualizado;
          comunicacao = {
            ok: true,
            mensagem: "API do Checkout Integrado acessível.",
          };
        } catch (error) {
          const mensagem = safeErrorMessage(error, "Falha ao testar a comunicação com a InfinitePay.");
          const { data: atualizado } = await admin
            .from("cardapio_exemplo_pagamento_config")
            .update({
              ultimo_teste_ok: false,
              ultimo_teste_em: new Date().toISOString(),
              ultimo_teste_ambiente: "producao",
              ultimo_teste_mensagem: mensagem,
            })
            .eq("id", 1)
            .select("*")
            .single();
          dbAtual = atualizado ?? db;
          comunicacao = { ok: false, mensagem };
        }
      }
    }

    const status = calcularStatus({ db: dbAtual, faltando });

    return json({
      ok: true,
      status,
      ambiente: "producao",
      configurado: faltando.length === 0,
      handleConfigurado: Boolean(config.handle),
      apiKeyConfigurado: Boolean(config.apiKey),
      faltando,
      webhookUrl: config.webhookUrl,
      appUrl: config.appUrl,
      ativo: Boolean(dbAtual?.infinitepay_ativo),
      ultimoTesteOk: Boolean(dbAtual?.ultimo_teste_ok),
      ultimoTesteEm: dbAtual?.ultimo_teste_em ?? null,
      ultimoTesteAmbiente: dbAtual?.ultimo_teste_ambiente ?? null,
      ultimoTesteMensagem: dbAtual?.ultimo_teste_mensagem ?? null,
      comunicacao,
      prontoParaProducao: faltando.length === 0 && Boolean(dbAtual?.ultimo_teste_ok),
    });
  } catch (error) {
    const status = Number((error as { status?: number } | null)?.status ?? 0);
    console.error("Falha ao consultar status da InfinitePay", {
      status,
      message: safeErrorMessage(error),
    });
    return erro(
      safeErrorMessage(error, "Não foi possível consultar o status da integração."),
      status >= 400 && status <= 599 ? status : 500,
    );
  }
});

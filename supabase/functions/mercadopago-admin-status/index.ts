import { erro, json, lerJson, preflight } from "../_shared/http.mjs";
import { requireAdmin } from "../_shared/supabase-admin.mjs";
import { getMpConfig, getMe, missingMpSecrets } from "../_shared/mp-api.mjs";
import { safeErrorMessage } from "../_shared/mp-core.mjs";

type DbConfig = {
  mercadopago_ativo?: boolean;
  ultimo_teste_ok?: boolean;
} | null;

function calcularStatus({
  db,
  faltando,
  ambiente,
}: {
  db: DbConfig;
  faltando: string[];
  ambiente: string;
}) {
  if (faltando.length === 3) return "nao_configurado";
  if (faltando.length > 0) return "aguardando_credenciais";
  if (ambiente === "producao") {
    if (db?.mercadopago_ativo && db?.ultimo_teste_ok) return "producao_ativa";
    if (db?.ultimo_teste_ok) return "pronto_para_producao";
    return "configurado_producao";
  }
  if (db?.ultimo_teste_ok) return "testes_aprovados";
  return "configurado_sandbox";
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

    const config = getMpConfig();
    const faltando = missingMpSecrets(config);
    let comunicacao = null;
    let dbAtual = db;

    if (body?.check) {
      if (!config.accessToken) {
        comunicacao = { ok: false, mensagem: "Access Token não configurado no servidor." };
      } else {
        try {
          await getMe(config);
          const agora = new Date().toISOString();
          const { data: atualizado, error: updateError } = await admin
            .from("cardapio_exemplo_pagamento_config")
            .update({
              ultimo_teste_ok: true,
              ultimo_teste_em: agora,
              ultimo_teste_ambiente: config.ambiente,
              ultimo_teste_mensagem: "Conexão autenticada com o Mercado Pago.",
            })
            .eq("id", 1)
            .select("*")
            .single();
          if (updateError) throw updateError;
          dbAtual = atualizado;
          comunicacao = { ok: true, mensagem: "Conexão autenticada com o Mercado Pago." };
        } catch (error) {
          const mensagem = safeErrorMessage(error, "Falha ao testar a comunicação com o Mercado Pago.");
          const { data: atualizado } = await admin
            .from("cardapio_exemplo_pagamento_config")
            .update({
              ultimo_teste_ok: false,
              ultimo_teste_em: new Date().toISOString(),
              ultimo_teste_ambiente: config.ambiente,
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

    const status = calcularStatus({
      db: dbAtual,
      faltando,
      ambiente: config.ambiente,
    });

    return json({
      ok: true,
      status,
      ambiente: config.ambiente,
      configurado: faltando.length === 0,
      accessTokenConfigurado: Boolean(config.accessToken),
      publicKeyConfigurado: Boolean(config.publicKey),
      webhookSecretConfigurado: Boolean(config.webhookSecret),
      faltando,
      webhookUrl: config.webhookUrl,
      appUrl: config.appUrl,
      ativo: Boolean(dbAtual?.mercadopago_ativo),
      pixOnline: Boolean(dbAtual?.pix_online_ativo),
      cartaoOnline: Boolean(dbAtual?.cartao_online_ativo),
      ultimoTesteOk: Boolean(dbAtual?.ultimo_teste_ok),
      ultimoTesteEm: dbAtual?.ultimo_teste_em ?? null,
      ultimoTesteAmbiente: dbAtual?.ultimo_teste_ambiente ?? null,
      ultimoTesteMensagem: dbAtual?.ultimo_teste_mensagem ?? null,
      comunicacao,
      prontoParaProducao:
        config.ambiente === "producao" && faltando.length === 0 && Boolean(dbAtual?.ultimo_teste_ok),
    });
  } catch (error) {
    const status = Number((error as { status?: number } | null)?.status ?? 0);
    console.error("Falha ao consultar status do Mercado Pago", {
      status,
      message: safeErrorMessage(error),
    });
    return erro(
      safeErrorMessage(error, "Não foi possível consultar o status da integração."),
      status >= 400 && status <= 599 ? status : 500,
    );
  }
});

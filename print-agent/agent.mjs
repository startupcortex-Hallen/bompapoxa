import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { formatTicket } from "./format-ticket.mjs";
import { enviarParaImpressora, verificarConexao } from "./escpos.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const configPath = process.env.PRINT_AGENT_CONFIG || path.join(__dirname, "agent.config.json");
const AGENT_VERSION = "1.0.0";

function log(...args) {
  console.log(`[${new Date().toISOString()}]`, ...args);
}

function erroResumido(error) {
  return String(error?.message ?? error ?? "erro desconhecido").slice(0, 500);
}

function carregarConfig() {
  if (!fs.existsSync(configPath)) {
    throw new Error(`Arquivo de configuração não encontrado: ${configPath}. Copie config.example.json para agent.config.json.`);
  }
  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  const obrigatorios = ["supabaseUrl", "supabaseAnonKey", "deviceToken", "printerInterface"];
  for (const campo of obrigatorios) {
    if (!config[campo] || String(config[campo]).includes("SEU-") || String(config[campo]).includes("SUA_") || String(config[campo]).includes("GERADO")) {
      throw new Error(`Configure o campo "${campo}" em agent.config.json com um valor real.`);
    }
  }
  return {
    ...config,
    printerWidthMm: Number(config.printerWidthMm) === 58 ? 58 : 80,
    pollIntervalMs: Math.max(2000, Number(config.pollIntervalMs) || 4000),
    batchSize: Math.min(5, Math.max(1, Number(config.batchSize) || 1)),
    printerType: config.printerType || "epson",
  };
}

async function main() {
  const config = carregarConfig();
  const supabase = createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const info = {
    agentVersion: AGENT_VERSION,
    platform: process.platform,
    hostname: os.hostname(),
    printerInterface: config.printerInterface,
    printerType: config.printerType,
    printerWidthMm: config.printerWidthMm,
    connected: false,
    startedAt: new Date().toISOString(),
  };

  let encerrando = false;
  let executando = false;
  let ultimoAvisoOffline = 0;

  const encerrar = () => {
    encerrando = true;
    log("Encerrando agente de impressão.");
    process.exit(0);
  };
  process.on("SIGINT", encerrar);
  process.on("SIGTERM", encerrar);

  async function ping(conectada) {
    info.connected = conectada;
    info.lastCheckAt = new Date().toISOString();
    const { error } = await supabase.rpc("cardapio_exemplo_agente_ping", {
      p_token: config.deviceToken,
      p_info: info,
    });
    if (error) throw new Error(`Ping rejeitado: ${error.message}`);
  }

  async function concluir(jobId, sucesso, erro) {
    const { error } = await supabase.rpc("cardapio_exemplo_agente_concluir", {
      p_token: config.deviceToken,
      p_job_id: jobId,
      p_sucesso: sucesso,
      p_erro: sucesso ? null : String(erro ?? "Falha na impressão.").slice(0, 1000),
    });
    if (error) throw new Error(`Falha ao concluir trabalho ${jobId}: ${error.message}`);
  }

  async function ciclo() {
    if (encerrando || executando) return;
    executando = true;
    try {
      let conectada = false;
      try {
        conectada = await verificarConexao(config);
      } catch (error) {
        conectada = false;
        info.lastError = erroResumido(error);
      }
      info.connected = conectada;

      if (!conectada) {
        const agora = Date.now();
        if (agora - ultimoAvisoOffline > 30_000) {
          ultimoAvisoOffline = agora;
          log("Impressora indisponível. Os trabalhos permanecerão pendentes e serão retomados na reconexão.");
          try {
            await ping(false);
          } catch (error) {
            log("Falha no ping:", erroResumido(error));
          }
        }
        return;
      }

      await ping(true);

      const { data: jobs, error: claimError } = await supabase.rpc("cardapio_exemplo_agente_claim_jobs", {
        p_token: config.deviceToken,
        p_limit: config.batchSize,
      });
      if (claimError) throw new Error(`Falha ao retirar trabalhos: ${claimError.message}`);
      if (!jobs?.length) return;

      for (const job of jobs) {
        if (encerrando) return;
        const largura = Number(job.largura_mm) === 58 ? 58 : config.printerWidthMm;
        const texto = formatTicket(job.payload ?? {}, largura);
        try {
          log(`Imprimindo ${job.job_key} (${largura} mm, tentativa ${job.tentativas}).`);
          await enviarParaImpressora(texto, { ...config, printerWidthMm: largura });
          await concluir(job.id, true, null);
          log(`Trabalho ${job.id} impresso.`);
        } catch (error) {
          const mensagem = erroResumido(error);
          info.lastError = mensagem;
          log(`Falha ao imprimir ${job.job_key}:`, mensagem);
          try {
            await concluir(job.id, false, mensagem);
          } catch (falhaConclusao) {
            log("Falha ao registrar erro do trabalho:", erroResumido(falhaConclusao));
          }
        }
      }
    } catch (error) {
      info.lastError = erroResumido(error);
      log("Ciclo com erro:", info.lastError);
      if (String(error?.message ?? "").includes("Token de impressora inválido")) {
        log("O token foi regenerado ou a impressora foi desativada. Atualize agent.config.json e reinicie o agente.");
        await new Promise((resolve) => setTimeout(resolve, 30_000));
      }
    } finally {
      executando = false;
    }
  }

  log(`Agente BOM PA POXA iniciado. Impressora: ${config.printerInterface}; largura: ${config.printerWidthMm} mm.`);
  log("Fila consultada a cada", config.pollIntervalMs, "ms.");
  void ciclo();

  setInterval(() => {
    if (!encerrando) void ciclo();
  }, config.pollIntervalMs);

  await new Promise(() => undefined);
}

main().catch((error) => {
  console.error("Agente não iniciou:", erroResumido(error));
  process.exit(1);
});

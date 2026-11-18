# Relatório de implementação — Mercado Pago + impressão automática

Data da implementação: 18/11/2026.

## 1. Escopo entregue

### Mercado Pago

- Checkout preparado para PIX online transparente (Orders API) e cartão online (Checkout Pro).
- Criação de pagamento somente no backend (Edge Functions).
- Consulta oficial de pagamento.
- Webhook com validação de assinatura HMAC, idempotência e reconsulta obrigatória.
- Banco de pagamentos, eventos, notificações processadas e configuração.
- Painel administrativo de pagamentos com status de configuração, teste de comunicação, webhook, últimos pagamentos e erros.
- Pagamentos manuais preservados: dinheiro, troco, cartão na máquina, PIX manual e comprovante por WhatsApp.
- Diferenciação de PIX manual, PIX online e cartão online.
- Status real no checkout e no acompanhamento do pedido.

### Impressão

- Fila persistente de impressão acionada automaticamente por trigger após a criação do pedido.
- Snapshot completo do pedido, incluindo adicionais, escolhas de combo, observações, pagamento, desconto e troco.
- Agente local Node.js com ESC/POS para 58 mm e 80 mm, rede TCP 9100 e USB via driver Windows.
- Token de dispositivo com hash, claim com `SKIP LOCKED`, tentativas, erro, cancelamento, reprocessamento e reimpressão.
- Scripts de instalação/remoção no Windows via tarefa agendada.
- Painel administrativo de impressão.
- Reimpressão no detalhe do pedido.

## 2. Arquivos criados

- `supabase/migrations/202611180001_bompapoxa_pagamentos_impressao.sql`
- `supabase/functions/mercadopago-create-payment/index.ts`
- `supabase/functions/mercadopago-sync-payment/index.ts`
- `supabase/functions/mercadopago-webhook/index.ts`
- `supabase/functions/mercadopago-admin-status/index.ts`
- `supabase/functions/_shared/http.mjs`
- `supabase/functions/_shared/mp-api.mjs`
- `supabase/functions/_shared/mp-core.mjs`
- `supabase/functions/_shared/mp-core.test.mjs`
- `supabase/functions/_shared/payment-service.mjs`
- `supabase/functions/_shared/supabase-admin.mjs`
- `supabase/config.toml`
- `supabase/.env.example`
- `src/lib/online-payments.ts`
- `src/lib/payment-status.ts`
- `src/lib/payment-status.test.ts`
- `src/routes/_authenticated/admin/pagamentos.tsx`
- `src/routes/_authenticated/admin/impressao.tsx`
- `print-agent/package.json`
- `print-agent/agent.mjs`
- `print-agent/escpos.mjs`
- `print-agent/format-ticket.mjs`
- `print-agent/config.example.json`
- `print-agent/test/format-ticket.test.mjs`
- `print-agent/install-windows.ps1`
- `print-agent/uninstall-windows.ps1`
- `print-agent/run-agent.bat`
- `print-agent/README.md`
- `print-agent/.gitignore`
- `docs/mercadopago.md`
- `docs/impressao.md`

## 3. Arquivos modificados

- `.github/workflows/deploy.yml` — novo passo de testes de integrações.
- `README.md` — integrações, stack, scripts, migration e testes.
- `package.json` — scripts `test:integrations` e `test:agent`.
- `scripts/validate-sql.mjs` — carrega todas as migrations e testa pagamentos/impressão/RLS.
- `src/lib/types.ts` — pagamentos, impressoras, fila e campos novos do pedido.
- `src/lib/mappers.ts` — mapeamento de pagamentos, eventos, impressoras e fila.
- `src/lib/queries.ts` — consultas administrativas, configuração pública e pagamentos nos pedidos.
- `src/lib/api.ts` — configuração de pagamento, impressoras, fila, teste, reprocessamento e reimpressão.
- `src/components/menu/CartDrawer.tsx` — opções online, PIX QR, Checkout Pro, estados e retentativa.
- `src/components/menu/MenuPage.tsx` — barra flutuante em portal + espaçamento do hero.
- `src/routes/pedido.tsx` — status real do pagamento, QR, copia e cola e verificação manual.
- `src/routes/_authenticated/admin/pedidos.tsx` — status do gateway, detalhe e reimpressão.
- `src/routes/_authenticated/admin/route.tsx` — menu Pagamentos e Impressão.
- `src/routeTree.gen.ts` — regenerado pelo TanStack Router.
- `supabase/README.md` — novas tabelas, RPCs, RLS e migration.
- `vitest.config.ts` — separação dos testes Node/Deno do Vitest de UI.

## 4. Banco de dados

### Tabelas novas

- `cardapio_exemplo_pagamento_config`
- `cardapio_exemplo_pagamentos`
- `cardapio_exemplo_pagamento_eventos`
- `cardapio_exemplo_webhooks_processados`
- `cardapio_exemplo_impressoras`
- `cardapio_exemplo_fila_impressao`

Total atual do projeto: **22 tabelas** prefixadas.

### Colunas novas

- `cardapio_exemplo_pedidos.pagamento_provedor`
- `cardapio_exemplo_pedidos.pagamento_online_tipo`

### RPCs novas/alteradas

- `cardapio_exemplo_pagamento_publico()`
- `cardapio_exemplo_get_pedido()` — agora inclui pagamento.
- `cardapio_exemplo_criar_impressora`
- `cardapio_exemplo_regenerar_token_impressora`
- `cardapio_exemplo_agente_ping`
- `cardapio_exemplo_agente_claim_jobs`
- `cardapio_exemplo_agente_concluir`
- `cardapio_exemplo_reprocessar_impressao`
- `cardapio_exemplo_cancelar_impressao`
- `cardapio_exemplo_enfileirar_reimpressao`
- `cardapio_exemplo_enfileirar_teste`
- `cardapio_exemplo_atualizar_payload_fila_pedido` (service role)

### Triggers novos

- Enfileiramento automático após insert de pedido.
- Atualização do snapshot enquanto o trabalho está pendente.

## 5. Edge Functions

| Função | Responsabilidade |
| --- | --- |
| `mercadopago-create-payment` | Cria/reutiliza tentativa, cria Order PIX ou preferência Checkout Pro |
| `mercadopago-sync-payment` | Consulta manual e sincronização com a API oficial |
| `mercadopago-webhook` | Valida HMAC, deduplica e processa `order`/`payment` |
| `mercadopago-admin-status` | Valida admin, status de credenciais, teste de comunicação |

Variáveis usadas:

- `MERCADOPAGO_ACCESS_TOKEN`
- `MERCADOPAGO_PUBLIC_KEY`
- `MERCADOPAGO_WEBHOOK_SECRET`
- `MERCADOPAGO_ENVIRONMENT`
- `APP_PUBLIC_URL`
- opcionais com sufixo `_SANDBOX` e `_PRODUCTION`.

## 6. Segredos que ainda precisam ser cadastrados

Nenhuma credencial foi fornecida nesta implementação. Ainda é necessário cadastrar:

- Access Token do Mercado Pago (teste e/ou produção).
- Public Key (teste e/ou produção).
- Webhook Secret (teste e/ou produção).
- `APP_PUBLIC_URL` se o domínio mudar.
- Opcionalmente `MERCADOPAGO_WEBHOOK_URL`.

Comandos:

```bash
supabase login
supabase secrets set --env-file supabase/.env
supabase functions deploy mercadopago-create-payment
supabase functions deploy mercadopago-sync-payment
supabase functions deploy mercadopago-webhook
supabase functions deploy mercadopago-admin-status
```

## 7. Migrations aplicadas

- [x] Migration criada no repositório.
- [x] Migration validada localmente em PGlite.
- [ ] Migration aplicada no Supabase remoto — **pendente**: não havia `SUPABASE_ACCESS_TOKEN`, senha do banco ou CLI autenticado no ambiente.
- [ ] Edge Functions publicadas no Supabase remoto — **pendente** pelo mesmo motivo.
- [ ] Webhook configurado no painel Mercado Pago — depende das credenciais.
- [ ] Compra Sandbox real — depende das credenciais.
- [ ] Impressão física — depende da impressora conectada.

## 8. Testes executados

| Comando | Resultado |
| --- | --- |
| `npm run typecheck` | Aprovado |
| `npm run lint` | Aprovado |
| `npm test` | 6 arquivos, 27 testes aprovados |
| `npm run test:integrations` | 12 testes aprovados (7 Mercado Pago + 5 cupom ESC/POS) |
| `npm run test:sql` | Aprovado: schema, pedidos, cupom, histórico, pagamentos, impressão e RLS |
| `deno check` nas 4 Edge Functions | Aprovado com Deno 2.9.6 |
| `npm install` em `print-agent/` | Aprovado, 0 vulnerabilidades |
| Import de `escpos.mjs` e `node-thermal-printer` | Aprovado |
| `npm run build` | Aprovado |

### O que os testes cobrem

Mercado Pago:

- normalização de status;
- PIX pendente/aprovado;
- cartão aprovado;
- assinatura HMAC válida e inválida;
- extração de evento `order`/`payment`;
- payload PIX e preferência;
- ausência de vazamento de token em erro.

Impressão:

- cupom 58/80 mm;
- entrega e retirada;
- adicionais;
- combo configurável;
- observações longas;
- desconto, troca e PIX pendente;
- teste de impressão;
- trigger automático da fila;
- `job_key` único;
- token inválido;
- claim e conclusão;
- reimpressão com solicitante;
- isolamento RLS.

## 9. Build e publicação

- Build local: aprovado (`dist/`).
- Pipeline do GitHub Actions: preservado e ampliado com `test:integrations`.
- Commit publicado: `2508e2b` (`feat: integra mercado pago e impressao automatica`).
- Workflow: <https://github.com/startupcortex-Hallen/bompapoxa/actions/runs/44381156230> — **success**.
- Site publicado: <https://startupcortex-hallen.github.io/bompapoxa/> — HTTP 200.
- O deploy do frontend foi concluído. A ativação funcional do Mercado Pago e da impressão continua dependendo das etapas de backend abaixo.

### Observação de publicação

O frontend pode ser publicado com segurança mesmo antes da migration: as opções online ficam ocultas quando o RPC de configuração não existe, e as novas telas mostram erro orientando a aplicar a migration. As funcionalidades existentes continuam funcionando.

Para ativar de verdade Mercado Pago e impressão, é necessário:

1. aplicar a migration no Supabase;
2. cadastrar os segredos;
3. publicar as Edge Functions;
4. configurar o webhook;
5. ativar no painel.

## 10. Menu flutuante

A barra flutuante da sacola foi movida para um `createPortal` no `document.body`, eliminando qualquer risco de recorte por ancestral com transformação/overflow. O hero recebeu padding inferior extra quando há itens na sacola, para que as informações de entrega/pagamento não fiquem atrás da barra. Validado em captura headless mobile 390×844 e 320×640: barra fixa, dentro do viewport e sem corte horizontal.

## 11. Pendências reais

1. Cadastrar credenciais oficiais do Mercado Pago.
2. Aplicar a migration no projeto Supabase real.
3. Publicar as quatro Edge Functions.
4. Configurar webhook de teste e produção.
5. Executar compra Sandbox real de PIX e cartão.
6. Ativar o gateway no painel.
7. Conectar impressora física e homologar 58/80 mm, USB/rede, desligamento e reconexão.
8. O frontend foi publicado, mas o fluxo online ainda não pode ser validado em produção sem a migration/Edge Functions/credenciais.

Nenhuma dessas pendências foi declarada como concluída.

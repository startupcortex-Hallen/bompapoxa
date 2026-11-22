# Relatório de implementação — InfinitePay + impressão automática

Atualizado em 19/11/2026 após a auditoria e substituição do provedor de pagamentos.

## 1. Escopo entregue

### Pagamentos online

- Checkout Integrado da InfinitePay com link hospedado (PIX e cartão).
- Criação de checkout somente no backend (Edge Functions).
- Consulta oficial de pagamento em `/payment_check`.
- Webhook sem assinatura, com validação de pedido/valor e confirmação server-to-server.
- Idempotência por `evento_key` e por `pedido_id`.
- Banco de pagamentos, eventos, notificações processadas e configuração.
- Painel administrativo de pagamentos com status de credenciais, teste de comunicação, webhook, últimos pagamentos e erros.
- Pagamentos manuais preservados: dinheiro, troco, cartão na máquina, PIX manual e comprovante por WhatsApp.
- Diferenciação de PIX manual, pagamento online e cartão na máquina.
- Status real no checkout e no acompanhamento do pedido.
- Retorno do checkout com sincronização automática por `transaction_nsu`/`slug`.

### Impressão

- Fila persistente de impressão acionada automaticamente por trigger após a criação do pedido.
- Snapshot completo do pedido, incluindo adicionais, escolhas de combo, observações, pagamento, desconto e troco.
- Agente local Node.js com ESC/POS para 58 mm e 80 mm, rede TCP 9100 e USB via driver Windows.
- Token de dispositivo com hash, claim com `SKIP LOCKED`, tentativas, erro, cancelamento, reprocessamento e reimpressão.
- Scripts de instalação/remoção no Windows via tarefa agendada.
- Painel administrativo de impressão.
- Reimpressão no detalhe do pedido.

## 2. Arquivos principais

### Pagamentos

- `supabase/migrations/202611180001_bompapoxa_pagamentos_impressao.sql`
- `supabase/migrations/202611190001_bompapoxa_infinitepay.sql`
- `supabase/functions/infinitepay-create-payment/index.ts`
- `supabase/functions/infinitepay-sync-payment/index.ts`
- `supabase/functions/infinitepay-webhook/index.ts`
- `supabase/functions/infinitepay-admin-status/index.ts`
- `supabase/functions/_shared/infinitepay-api.mjs`
- `supabase/functions/_shared/infinitepay-core.mjs`
- `supabase/functions/_shared/infinitepay-core.test.mjs`
- `supabase/functions/_shared/payment-service.mjs`
- `src/lib/online-payments.ts`
- `src/lib/payment-status.ts`
- `src/routes/_authenticated/admin/pagamentos.tsx`
- `docs/infinitepay.md`
- `docs/auditoria-pagamentos.md`

### Impressão

- `supabase/functions/_shared/supabase-admin.mjs`
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
- `docs/impressao.md`

## 3. Banco de dados

### Tabelas

- `cardapio_exemplo_pagamento_config`
- `cardapio_exemplo_pagamentos`
- `cardapio_exemplo_pagamento_eventos`
- `cardapio_exemplo_webhooks_processados`
- `cardapio_exemplo_impressoras`
- `cardapio_exemplo_fila_impressao`

### Campos neutros do gateway

- `provedor`
- `ambiente`
- `tipo` (`online`, `pix`, `cartao`)
- `status`
- `status_gateway`
- `metodo`
- `gateway_order_id`
- `gateway_payment_id`
- `gateway_checkout_id`
- `gateway_external_reference`
- `checkout_url`
- `receipt_url`

### RPCs

- `cardapio_exemplo_pagamento_publico()`
- `cardapio_exemplo_get_pedido()` com resumo do pagamento online
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

### Triggers

- Enfileiramento automático após insert de pedido.
- Atualização do snapshot enquanto o trabalho está pendente.

## 4. Edge Functions

| Função | Responsabilidade |
| --- | --- |
| `infinitepay-create-payment` | Cria/reutiliza tentativa e gera o link do Checkout Integrado |
| `infinitepay-sync-payment` | Consulta manual e sincronização no retorno do checkout |
| `infinitepay-webhook` | Deduplica, confirma em `/payment_check` e atualiza o pedido |
| `infinitepay-admin-status` | Valida admin, credenciais e comunicação com a API |

Variáveis usadas:

- `INFINITEPAY_HANDLE`
- `INFINITEPAY_API_KEY`
- `APP_PUBLIC_URL`
- opcional `INFINITEPAY_WEBHOOK_URL`

## 5. Segredos que ainda precisam ser cadastrados

Nenhuma credencial foi fornecida nesta implementação. Ainda é necessário cadastrar:

- InfiniteTag da conta InfinitePay.
- API Key criada no Checkout Integrado.
- `APP_PUBLIC_URL` se o domínio mudar.
- Opcionalmente `INFINITEPAY_WEBHOOK_URL`.

Comandos:

```bash
supabase login
supabase secrets set --env-file supabase/.env
supabase functions deploy infinitepay-create-payment
supabase functions deploy infinitepay-sync-payment
supabase functions deploy infinitepay-webhook
supabase functions deploy infinitepay-admin-status
```

## 6. Migrations

- [x] Migration base criada no repositório.
- [x] Migration de transição criada e validada em PGlite.
- [x] Schema sem campos `mp_*`, `status_mp`, QR Code ou Checkout Pro.
- [ ] Migration aplicada no Supabase remoto — pendente de acesso ao projeto.
- [ ] Edge Functions publicadas no Supabase remoto — pendente de credenciais/CLI.
- [ ] Compra real de homologação — pendente de credenciais.
- [ ] Impressão física — pendente da impressora conectada.

## 7. Testes executados

| Comando | Resultado |
| --- | --- |
| `npm run typecheck` | Aprovado |
| `npm run lint` | Aprovado |
| `npm test` | 6 arquivos, 27 testes aprovados |
| `npm run test:integrations` | 11 testes aprovados (6 InfinitePay + 5 cupom ESC/POS) |
| `npm run test:sql` | Aprovado: schema, pedidos, cupom, histórico, pagamentos, transição do gateway, impressão e RLS |
| `npm run build` | Aprovado |

### O que os testes cobrem

InfinitePay:

- normalização de eventos (`paid`, `settled`, `canceled`, `refunded`, `payment_failed`);
- valores em centavos;
- payload do link com `single_payment`, validade e métodos;
- validação de URL HTTPS do checkout;
- pagamento aprovado PIX e cartão;
- pagamento pendente;
- divergência de valor;
- extração de webhook com `order_nsu`;
- ausência de vazamento da API Key em erros.

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

## 8. Build e publicação

- Build local: aprovado (`dist/`).
- Pipeline do GitHub Actions: typecheck, lint, testes, integrações, SQL e build.
- A ativação funcional da InfinitePay e da impressão depende das etapas de backend abaixo.

## 9. Pendências reais

1. Cadastrar InfiniteTag e API Key da InfinitePay.
2. Aplicar as migrations no projeto Supabase real.
3. Publicar as quatro Edge Functions.
4. Aprovar o teste de comunicação.
5. Fazer compra real de valor baixo e confirmar o webhook.
6. Estornar a compra de homologação pelo app da InfinitePay.
7. Ativar o gateway no painel.
8. Conectar impressora física e homologar 58/80 mm, USB/rede, desligamento e reconexão.

Nenhuma dessas pendências foi declarada como concluída.

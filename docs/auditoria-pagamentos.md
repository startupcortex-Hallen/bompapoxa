# Auditoria total — pagamentos online

Data: 19/11/2026.

## 1. Escopo

Auditoria do fluxo de pagamento do BOM PA POXA antes e depois da troca do Mercado Pago pela InfinitePay:

- checkout público;
- criação, consulta e confirmação de pagamento;
- webhook e idempotência;
- banco, RLS, RPCs e triggers;
- painel administrativo;
- rotina de impressão;
- documentação, variáveis de ambiente, testes e deploy.

## 2. Achados da auditoria

| Área | Achado | Risco | Correção |
| --- | --- | --- | --- |
| Backend | Quatro Edge Functions e módulos compartilhados presos ao Mercado Pago (`mp-*`) | Alto acoplamento e impossibilidade de trocar de gateway | Funções `infinitepay-*` e módulos `infinitepay-*` |
| Banco | Colunas `mp_*`, `status_mp`, `init_point`, `qr_code`, `ticket_url` | Modelo específico do provedor antigo | Colunas neutras `gateway_*`, `checkout_url`, `receipt_url` |
| Banco | Constraint `pagamento_provedor` aceitava `mercadopago` | Dados inválidos após a troca | Constraint agora aceita `manual` e `infinitepay` |
| Banco | `pix_online_ativo` e `cartao_online_ativo` não representam o checkout hospedado | Configuração enganosa | Ativação única `infinitepay_ativo` |
| Webhook | Assinatura HMAC do Mercado Pago | Incompatível com a InfinitePay | Confirmação server-to-server em `/payment_check` |
| Webhook | Pagamento podia ser aprovado apenas pelo payload | Fraude por notificação forjada | `paid: true` + valor compatível + `order_nsu` validado |
| Webhook | Retentativa infinita em erros permanentes | Consumo de fila/log | 200 para divergência/desconhecido; 500 apenas para falha transitória |
| Frontend | QR Code e PIX copia e cola do gateway antigo | UI sem suporte na InfinitePay | Botão único de checkout hospedado |
| Frontend | E-mail obrigatório por exigência do Mercado Pago | Atrito desnecessário | E-mail opcional para pré-preencher o checkout |
| Frontend | Status e textos citavam Mercado Pago | Informação incorreta ao cliente | Textos e rótulos migrados para InfinitePay |
| Frontend | Duas opções online (`PIX` e `cartão`) para um único checkout | Duplicidade e expectativa errada | Uma opção: “Pagamento online (PIX ou cartão)” |
| Admin | Exigia Public Key e Webhook Secret | Credenciais inexistentes na InfinitePay | Exibe apenas InfiniteTag e API Key |
| Admin | Teste de comunicação chamava `/users/me` | Endpoint inexistente na InfinitePay | Health check da API + validação de credenciais na primeira cobrança |
| Impressão | Cupom imprimia “MERCADO PAGO” | Cupom incorreto | Cupom imprime InfinitePay |
| Docs/env | Guia, README, relatório e `.env.example` com variáveis antigas | Operação e deploy confusos | Guia novo `docs/infinitepay.md` e env atualizado |
| Testes | Testes validavam HMAC, Orders API e Checkout Pro | Cobertura do provedor removido | Testes novos de evento, valores, payload e vazamento de chave |

## 3. O que foi removido

- Edge Functions `mercadopago-*`.
- Módulos `_shared/mp-api.mjs`, `_shared/mp-core.mjs` e `_shared/mp-core.test.mjs`.
- Variáveis `MERCADOPAGO_*`.
- Guia `docs/mercadopago.md`.
- Campos de QR Code, ticket, preferência e pontos de checkout do provedor antigo.
- Dependência de assinatura HMAC.
- Status de integração de sandbox (a InfinitePay não possui sandbox).

## 4. O que foi criado

- `infinitepay-create-payment`: cria/reutiliza o link do Checkout Integrado.
- `infinitepay-sync-payment`: consulta manual e sincronização no retorno do checkout.
- `infinitepay-webhook`: recebe eventos, valida e confirma em `/payment_check`.
- `infinitepay-admin-status`: valida admin, credenciais presentes e comunicação.
- `_shared/infinitepay-api.mjs`: cliente HTTP da API.
- `_shared/infinitepay-core.mjs`: payload, centavos, eventos, status e sanitização de erros.
- Migration `202611190001_bompapoxa_infinitepay.sql`: transição idempotente do banco.
- `docs/infinitepay.md`: ativação, fluxo, testes, checklist e troubleshooting.

## 5. Decisões de arquitetura

### Checkout hospedado único

A InfinitePay não permite desligar o cartão e não devolve QR Code por API. Por isso o checkout do site oferece uma única opção online. A escolha entre PIX e cartão acontece na página da InfinitePay.

### Sem sandbox

A InfinitePay não oferece ambiente de testes. A homologação usa compras reais de valor baixo e estorno pelo app. O painel deixa isso explícito.

### Sem assinatura de webhook

O webhook não tem HMAC. A segurança vem de:

1. validar `order_nsu` contra o pedido local;
2. validar o valor em centavos;
3. consultar `/payment_check`;
4. exigir `paid: true`;
5. usar `evento_key` único para idempotência.

### Preservação de pedidos pagos na migração

A migration remove as tentativas do provedor antigo para eliminar os metadados do Mercado Pago. Pedidos pagos mantêm `status_pagamento = 'pago'`, mas passam a ser tratados como pagamento manual histórico. Nenhuma credencial real do provedor anterior estava configurada no projeto.

## 6. Arquivos alterados

### Backend

- `supabase/functions/infinitepay-create-payment/index.ts`
- `supabase/functions/infinitepay-sync-payment/index.ts`
- `supabase/functions/infinitepay-webhook/index.ts`
- `supabase/functions/infinitepay-admin-status/index.ts`
- `supabase/functions/_shared/infinitepay-api.mjs`
- `supabase/functions/_shared/infinitepay-core.mjs`
- `supabase/functions/_shared/infinitepay-core.test.mjs`
- `supabase/functions/_shared/payment-service.mjs`
- `supabase/config.toml`
- `supabase/.env.example`

### Banco

- `supabase/migrations/202611180001_bompapoxa_pagamentos_impressao.sql`
- `supabase/migrations/202611190001_bompapoxa_infinitepay.sql`

### Frontend

- `src/lib/types.ts`
- `src/lib/mappers.ts`
- `src/lib/queries.ts`
- `src/lib/online-payments.ts`
- `src/lib/payment-status.ts`
- `src/lib/payment-status.test.ts`
- `src/components/menu/CartDrawer.tsx`
- `src/routes/pedido.tsx`
- `src/routes/_authenticated/admin/pagamentos.tsx`
- `src/routes/_authenticated/admin/pedidos.tsx`

### Operação e testes

- `print-agent/format-ticket.mjs`
- `print-agent/test/format-ticket.test.mjs`
- `scripts/validate-sql.mjs`
- `package.json`
- `README.md`
- `docs/impressao.md`
- `docs/RELATORIO-IMPLEMENTACAO.md`
- `supabase/README.md`

## 7. Riscos residuais

1. A confirmação depende do webhook e/ou do retorno do cliente. O botão **Verificar pagamento** cobre atrasos.
2. O webhook precisa responder rápido; a consulta ao `/payment_check` é feita na própria função. Se a API estiver lenta, a InfinitePay reenvia o evento.
3. Não há estorno pela API; a operação é manual no app/conta web.
4. O link expira em 30 minutos. Depois disso, um novo link é criado no próximo clique.
5. A API Key precisa ser rotacionada no app se houver vazamento; até 5 chaves podem coexistir.

## 8. Checklist de validação

- [x] Nenhuma referência a Mercado Pago no código de execução, env ou documentação operacional. A migration de transição cita o provedor antigo apenas para renomear/remover os campos.
- [x] `npm run typecheck` aprovado.
- [x] `npm run lint` aprovado.
- [x] `npm test` aprovado.
- [x] `npm run test:integrations` aprovado.
- [x] `npm run test:sql` aprovado, incluindo a transição de um schema antigo simulado para o novo gateway.
- [x] `npm run build` aprovado.
- [ ] Migration aplicada no Supabase remoto.
- [ ] Segredos da InfinitePay cadastrados.
- [ ] Quatro Edge Functions publicadas.
- [ ] Compra real de valor baixo homologada.
- [ ] Webhook confirmado nos logs.
- [ ] Integração ativada no painel.

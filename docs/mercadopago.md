# Mercado Pago — integração, ativação e testes

Esta integração foi preparada para receber credenciais oficiais sem refazer o código. Nenhuma credencial real foi incluída no repositório e nenhum pagamento real foi executado nesta implementação.

## 1. Decisão de arquitetura

Foram escolhidas duas trilhas oficiais:

| Fluxo | API | Motivo |
| --- | --- | --- |
| PIX online | **Checkout Transparente via Orders API** (`POST /v1/orders`) | Permite exibir QR Code e código copia e cola dentro do checkout atual, sem redirecionar o cliente. |
| Cartão online | **Checkout Pro via Preferences API** (`POST /checkout/preferences`) | Não exige que o site manipule dados de cartão. O cliente paga no ambiente seguro do Mercado Pago e retorna ao acompanhamento. |

O PIX manual continua existindo separadamente. Em nenhuma das trilhas o frontend cria pagamento, aprova pagamento ou confia no valor recebido do navegador.

### Por que não usar cartão transparente agora?

Cartão transparente exigiria tokenização de cartão no frontend, tratamento de PCI e uma UI de cartão. O Checkout Pro elimina esse escopo e mantém a integração segura. A camada de pagamento foi isolada para permitir trocar a trilha de cartão no futuro.

## 2. Arquivos

### Frontend

- `src/lib/online-payments.ts` — chamadas às Edge Functions.
- `src/lib/payment-status.ts` — rótulos e regras de apresentação.
- `src/components/menu/CartDrawer.tsx` — opções online, QR PIX, checkout Pro, erros e retentativa.
- `src/routes/pedido.tsx` — status real do pagamento, QR, cópia do código e verificação manual.
- `src/routes/_authenticated/admin/pagamentos.tsx` — painel de configuração e status.
- `src/routes/_authenticated/admin/pedidos.tsx` — status do gateway e reimpressão.

### Edge Functions

- `supabase/functions/mercadopago-create-payment/index.ts`
- `supabase/functions/mercadopago-sync-payment/index.ts`
- `supabase/functions/mercadopago-webhook/index.ts`
- `supabase/functions/mercadopago-admin-status/index.ts`
- `supabase/functions/_shared/mp-api.mjs`
- `supabase/functions/_shared/mp-core.mjs`
- `supabase/functions/_shared/payment-service.mjs`
- `supabase/functions/_shared/supabase-admin.mjs`
- `supabase/functions/_shared/http.mjs`

### Banco

- Migration: `supabase/migrations/202611180001_bompapoxa_pagamentos_impressao.sql`
- Tabelas: `cardapio_exemplo_pagamentos`, `cardapio_exemplo_pagamento_eventos`, `cardapio_exemplo_webhooks_processados`, `cardapio_exemplo_pagamento_config`.
- RPC pública: `cardapio_exemplo_pagamento_publico()`.
- `cardapio_exemplo_get_pedido()` agora devolve o resumo do pagamento online.

## 3. Onde encontrar cada credencial

1. Acesse <https://www.mercadopago.com.br/developers/panel/app>.
2. Selecione a aplicação.
3. Abra **Credenciais**.
4. Use o seletor **Teste** para Sandbox ou **Produção** para produção.
5. Copie:
   - **Public Key**
   - **Access Token**
6. O **Webhook Secret** é gerado em **Webhooks > Configurar notificações** ao salvar a URL. Use o botão para revelar/copiar.

O Access Token começa com `APP_USR` tanto em teste quanto em produção. Confira o seletor de ambiente antes de copiar.

## 4. Segredos no Supabase

Crie `supabase/.env` a partir de `supabase/.env.example` e preencha. Não faça commit desse arquivo.

```env
MERCADOPAGO_ENVIRONMENT=sandbox
MERCADOPAGO_ACCESS_TOKEN=
MERCADOPAGO_PUBLIC_KEY=
MERCADOPAGO_WEBHOOK_SECRET=
APP_PUBLIC_URL=https://startupcortex-hallen.github.io/bompapoxa
```

Também é possível manter os dois ambientes no mesmo projeto usando os sufixos:

```env
MERCADOPAGO_ACCESS_TOKEN_SANDBOX=
MERCADOPAGO_PUBLIC_KEY_SANDBOX=
MERCADOPAGO_WEBHOOK_SECRET_SANDBOX=

MERCADOPAGO_ACCESS_TOKEN_PRODUCTION=
MERCADOPAGO_PUBLIC_KEY_PRODUCTION=
MERCADOPAGO_WEBHOOK_SECRET_PRODUCTION=
```

As variáveis com sufixo têm prioridade sobre as variáveis sem sufixo quando o ambiente correspondente está ativo.

Aplique:

```bash
supabase secrets set --env-file supabase/.env
```

O `SUPABASE_URL` e o `SUPABASE_SERVICE_ROLE_KEY` são fornecidos pelo runtime das Edge Functions e não devem ser copiados para o frontend.

## 5. Publicar as funções

```bash
supabase functions deploy mercadopago-create-payment
supabase functions deploy mercadopago-sync-payment
supabase functions deploy mercadopago-webhook
supabase functions deploy mercadopago-admin-status
```

O `supabase/config.toml` já define `verify_jwt = false` para essas funções. A autenticação é feita dentro do código:

- `create` e `sync`: token privado do pedido.
- `webhook`: assinatura HMAC oficial.
- `admin-status`: JWT do Supabase + papel `admin` na tabela de perfis.

## 6. Aplicar a migration

No SQL Editor do Supabase, execute a migration nova depois das migrations existentes:

```text
supabase/migrations/202611180001_bompapoxa_pagamentos_impressao.sql
```

Ou use o fluxo de migrations do Supabase CLI. A migration:

- adiciona `pagamento_provedor` e `pagamento_online_tipo` em pedidos;
- cria as tabelas de pagamentos/eventos/webhooks/configuração;
- cria a fila de impressão e as impressoras;
- cria os triggers e RPCs;
- habilita RLS e não remove dados existentes.

## 7. Configurar o webhook

No painel do Mercado Pago:

1. Aplicação > **Webhooks > Configurar notificações**.
2. No seletor, escolha **Teste**.
3. Cadastre a URL exibida no painel administrativo:

```text
https://<PROJECT_REF>.supabase.co/functions/v1/mercadopago-webhook
```

4. Habilite os eventos:
   - **Order (Mercado Pago)**, tópico `order` — necessário para PIX transparente.
   - **Pagamentos**, tópico `payment` — necessário para Checkout Pro.
5. Salve e copie a **assinatura secreta** para `MERCADOPAGO_WEBHOOK_SECRET` (ou a variante do ambiente).
6. Repita em **Produção** antes de ativar credenciais de produção.

O webhook valida `x-signature` usando `ts`, `v1`, `x-request-id` e `data.id`, com HMAC SHA-256. Notificações inválidas retornam 401 e não alteram pedidos.

## 8. Fluxo do PIX online

1. Cliente confirma o pedido. O servidor cria o pedido via `place_order`, recalculando preços e taxa.
2. O frontend chama `mercadopago-create-payment` com `pedidoId`, `trackingToken` e `tipo: "pix"`.
3. A função valida o pedido/token, o status e a configuração pública.
4. Cria ou reutiliza uma tentativa idempotente na tabela de pagamentos.
5. Chama `POST /v1/orders` com `X-Idempotency-Key`.
6. Salva IDs, status, QR Code e código copia e cola.
7. O cliente vê o QR e o código no checkout e no acompanhamento.
8. O webhook de `order` reconsulta `GET /v1/orders/{id}` e atualiza o pedido.
9. O cliente também pode clicar em **Verificar pagamento**, que consulta a API oficial.
10. Somente status oficialmente aprovado muda `status_pagamento` para `pago`.

A criação exige e-mail válido porque a Orders API usa `payer.email`.

## 9. Fluxo do cartão online

1. Cliente confirma o pedido.
2. O frontend chama `mercadopago-create-payment` com `tipo: "cartao"`.
3. A função cria uma preferência no Checkout Pro com valor total do pedido e `external_reference`.
4. O frontend mostra o botão para abrir o checkout.
5. O cliente paga no ambiente do Mercado Pago.
6. O webhook de `payment` reconsulta `GET /v1/payments/{id}`.
7. O pedido é atualizado somente após a API oficial confirmar o status.

## 10. Idempotência e segurança

- `place_order` valida produtos, adicionais, combos, cupom, taxa, pedido mínimo e loja aberta.
- A criação do pagamento usa o total salvo no banco, nunca o total enviado pelo navegador.
- Cada tentativa tem `idempotency_key` única e a tabela tem `unique (pedido_id)`.
- Duas requisições simultâneas para o mesmo pedido reutilizam a mesma tentativa ou retornam conflito.
- O webhook sempre reconsulta o recurso oficial antes de alterar o banco.
- `evento_key` único evita processar a mesma notificação duas vezes.
- Notificações com valor divergente não aprovam o pedido.
- Pedido cancelado não é marcado como pago, mesmo que o gateway envie um pagamento aprovado; o evento fica registrado para análise.
- O cliente nunca consegue escrever diretamente em `pagamentos`, `pagamento_eventos`, `webhooks_processados` ou `fila_impressao`.
- O Access Token nunca vai para o frontend.

## 11. Estados exibidos

| Estado interno | Origem típica |
| --- | --- |
| `pendente` | Pagamento aguardando transferência ou checkout |
| `em_processamento` | Gateway processando |
| `aprovado` | `processed`, `approved`, `accredited` |
| `recusado` | `rejected`, `failed` |
| `cancelado` | `cancelled` |
| `expirado` | `expired` |
| `estornado` | `refunded`, `charged_back` |
| `erro` | Falha de comunicação ou valor divergente |

## 12. Testes Sandbox

Sem credenciais, é possível validar:

- migration e RLS: `npm run test:sql`;
- normalização de status, HMAC e payloads: `npm run test:integrations`;
- configuração ausente: PIX/cartão online não aparecem no checkout;
- webhook inválido: retorna 401;
- webhook repetido: retorna 200 sem reprocessar;
- criação/consulta sem credenciais: retorna erro controlado.

Com credenciais de teste:

1. Configure `MERCADOPAGO_ENVIRONMENT=sandbox` e as credenciais de teste.
2. Publique as funções e a migration.
3. Preencha a URL de webhook no ambiente Teste.
4. No painel, clique em **Verificar comunicação**.
5. Ative PIX online e/ou Cartão online.
6. Faça um pedido de teste.
7. PIX: use o QR/código gerado na conta de teste.
8. Cartão: use os cartões de teste oficiais do Mercado Pago.
9. Confirme no painel de pedidos que o pagamento só mudou após o webhook/consulta oficial.

> Não foi possível executar compras Sandbox reais nesta implementação porque nenhuma credencial oficial foi fornecida. O código está preparado, mas a homologação depende das credenciais e da configuração do webhook.

## 13. Passagem para produção

Checklist:

- [ ] Aplicação de produção ativada no Mercado Pago.
- [ ] Credenciais de produção cadastradas no Supabase.
- [ ] `MERCADOPAGO_ENVIRONMENT=producao`.
- [ ] Webhook de produção cadastrado com a URL de produção.
- [ ] Assinatura secreta de produção cadastrada.
- [ ] Teste de comunicação aprovado.
- [ ] Compra de teste aprovada em Sandbox.
- [ ] PIX e cartão online ativados no painel.
- [ ] Acompanhamento mostrando status real.
- [ ] Equipe orientada de que pagamento manual continua independente.

O painel mostra:

- Não configurado;
- Aguardando credenciais;
- Configurado em Sandbox;
- Testes aprovados;
- Pronto para produção;
- Produção ativa.

## 14. Limitações atuais

- Não há reembolso/cancelamento automático pelo painel; o Mercado Pago deve ser operado no painel dele.
- Não há split, assinatura ou marketplace.
- Cartão transparente não foi implementado; cartão online usa Checkout Pro.
- A taxa de expiração do PIX é de 30 minutos na criação.
- A confirmação de pagamento manual continua sendo feita pelo administrador.
- Webhooks dependem de segredo configurado; sem ele, o webhook responde 503 para o Mercado Pago tentar novamente.

## 15. Troubleshooting

| Sintoma | Causa | Ação |
| --- | --- | --- |
| Opções online não aparecem | Integração inativa ou migration ausente | Verifique `cardapio_exemplo_pagamento_publico` e ative no painel |
| "Access Token não configurado" | Segredo ausente | `supabase secrets set` |
| "A integração ainda não foi publicada" | Edge Function ausente | Deploy das funções |
| Webhook 401 | Assinatura inválida/segredo errado | Confira `MERCADOPAGO_WEBHOOK_SECRET` e `data.id` |
| Webhook 503 | Segredo ausente | Cadastre o segredo |
| Pagamento criado, pedido pendente | Webhook não chegou | Clique em Verificar pagamento e confira logs da função |
| Valor divergente | Total do MP diferente do pedido | Veja o evento no painel; não aprove manualmente sem investigar |
| PIX sem e-mail | Checkout Pro/Orders exige payer.email | Informe e-mail no checkout |

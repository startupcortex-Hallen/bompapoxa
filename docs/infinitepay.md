# InfinitePay — Checkout Integrado, ativação e operação

Esta é a integração oficial usada pelo BOM PA POXA após a substituição do Mercado Pago. Nenhuma credencial real está no repositório.

## 1. Decisão de arquitetura

A InfinitePay disponibiliza o **Checkout Integrado**: o servidor cria um link de pagamento, o cliente paga em uma página hospedada (PIX ou cartão de crédito) e o pedido é confirmado por webhook + consulta server-to-server.

| Item | Implementação |
| --- | --- |
| Criação do checkout | `POST https://api.checkout.infinitepay.io/links` |
| Consulta do pagamento | `POST https://api.checkout.infinitepay.io/payment_check` |
| Retorno do cliente | `redirect_url` com `order_nsu`, `transaction_nsu`, `slug`, `capture_method` e `receipt_url` |
| Confirmação | Webhook da InfinitePay reconsultado em `/payment_check` |
| Ambientes | A InfinitePay **não possui sandbox**; os links são reais |
| Cartão | Sempre habilitado no link; a API não permite desativá-lo |
| PIX | Habilitado no link; o QR Code aparece apenas na página da InfinitePay |
| Assinatura do webhook | Não existe assinatura HMAC; a confirmação é feita na API |

### Limitações aceitas

- Não há checkout transparente, QR Code na loja, SDK de cartão ou tokenização.
- Não há reembolso/cancelamento pela API; use o app ou a conta web da InfinitePay.
- Não há split, assinatura ou cobrança recorrente.
- O link criado expira em 30 minutos (`options.valid_until`).
- O link aceita apenas um pagamento (`options.single_payment`).
- O cliente confirma o contato na página da InfinitePay. Nome e telefone vêm do pedido e ficam bloqueados nessa tela; por isso o checkout exige e-mail válido para pré-preencher e evitar digitação.
- Após escolher Pix e tocar em **Fazer Pedido**, a InfinitePay pode enviar um código por WhatsApp/SMS antes de exibir o QR Code e o copia-e-cola.

O frontend nunca calcula preço, nunca cria pagamento e nunca aprova pedido. O valor enviado ao gateway vem sempre do pedido gravado no banco.

## 2. Arquivos

### Frontend

- `src/lib/online-payments.ts` — chamadas às Edge Functions.
- `src/lib/payment-status.ts` — rótulos e regras de apresentação.
- `src/components/menu/CartDrawer.tsx` — opção de pagamento online, criação do link e retomada.
- `src/routes/pedido.tsx` — status real, abertura do checkout, comprovante e sincronização no retorno.
- `src/routes/_authenticated/admin/pagamentos.tsx` — configuração, teste de comunicação, webhook e eventos.
- `src/routes/_authenticated/admin/pedidos.tsx` — status do gateway e detalhes do pedido.

### Edge Functions

- `supabase/functions/infinitepay-create-payment/index.ts`
- `supabase/functions/infinitepay-sync-payment/index.ts`
- `supabase/functions/infinitepay-webhook/index.ts`
- `supabase/functions/infinitepay-admin-status/index.ts`
- `supabase/functions/_shared/infinitepay-api.mjs`
- `supabase/functions/_shared/infinitepay-core.mjs`
- `supabase/functions/_shared/infinitepay-core.test.mjs`
- `supabase/functions/_shared/payment-service.mjs`
- `supabase/functions/_shared/supabase-admin.mjs`
- `supabase/functions/_shared/http.mjs`

### Banco

- Base: `supabase/migrations/202611180001_bompapoxa_pagamentos_impressao.sql`
- Transição: `supabase/migrations/202611190001_bompapoxa_infinitepay.sql`
- Tabelas: `cardapio_exemplo_pagamentos`, `cardapio_exemplo_pagamento_eventos`, `cardapio_exemplo_webhooks_processados`, `cardapio_exemplo_pagamento_config`.
- RPC pública: `cardapio_exemplo_pagamento_publico()`.
- `cardapio_exemplo_get_pedido()` devolve o resumo do pagamento online.
- `cardapio_exemplo_payload_impressao()` inclui os IDs neutros do gateway.

## 3. Credenciais

1. Abra o app InfinitePay.
2. Vá em **Vendas > Checkout > Configurações**.
3. Ative **Habilitar Checkout Integrado**.
4. Crie uma **API Key** (`inchk_...`) e copie apenas uma vez.
5. Copie a **InfiniteTag** (handle) sem o símbolo `$`.
6. A API Key e a handle precisam pertencer à mesma conta.

A API Key é opcional para criar links simples, mas é obrigatória para as opções usadas aqui (`single_payment`, `valid_until`, `payment_methods_enabled`). Por isso o projeto exige handle **e** API Key.

## 4. Segredos no Supabase

Crie `supabase/.env` a partir de `supabase/.env.example`:

```env
INFINITEPAY_HANDLE=minha-handle
INFINITEPAY_API_KEY=inchk_...
APP_PUBLIC_URL=https://startupcortex-hallen.github.io/bompapoxa
# Opcional
INFINITEPAY_WEBHOOK_URL=
```

Aplique:

```bash
supabase secrets set --env-file supabase/.env
```

`SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` são fornecidos pelo runtime e não vão para o frontend.

## 5. Publicar as funções

```bash
supabase functions deploy infinitepay-create-payment
supabase functions deploy infinitepay-sync-payment
supabase functions deploy infinitepay-webhook
supabase functions deploy infinitepay-admin-status
```

O `supabase/config.toml` define `verify_jwt = false` para as quatro funções. A autenticação interna é:

- `create` e `sync`: token privado do pedido.
- `webhook`: consulta obrigatória a `/payment_check` antes de aprovar.
- `admin-status`: JWT do Supabase + papel `admin`.

## 6. Aplicar a migration

No SQL Editor, execute primeiro a migration base (se ainda não existir) e depois:

```text
supabase/migrations/202611190001_bompapoxa_infinitepay.sql
```

A migration de transição é idempotente e:

- renomeia a configuração para `infinitepay_ativo`;
- remove as tentativas do provedor anterior;
- renomeia `status_mp`, `mp_*` e `init_point` para campos neutros (`status_gateway`, `gateway_*`, `checkout_url`);
- adiciona `receipt_url`;
- remove `qr_code`, `qr_code_base64`, `ticket_url` e `sandbox_init_point`;
- troca `assinatura_valida` por `verificado`;
- recria RPCs e o snapshot de impressão;
- preserva pedidos pagos e o status financeiro, removendo apenas os metadados do gateway antigo.

## 7. Configurar o webhook

Não é necessário cadastrar a URL no painel da InfinitePay. Cada link criado envia:

```json
{
  "webhook": {
    "url": "https://<PROJECT_REF>.supabase.co/functions/v1/infinitepay-webhook",
    "events": ["paid", "settled", "canceled", "refunded", "payment_failed"]
  }
}
```

A URL pode ser sobrescrita com `INFINITEPAY_WEBHOOK_URL`. O webhook não tem assinatura. Por isso:

1. O payload é validado quanto a `order_nsu`, `transaction_nsu`, `slug` e valor.
2. O backend chama `POST /payment_check` antes de mudar o pedido.
3. Somente `paid: true` com valor compatível aprova o pedido.
4. Notificação duplicada é ignorada por `evento_key`.
5. Se a consulta falhar por rede/instabilidade, a função responde 500 para a InfinitePay tentar novamente.
6. Divergência de valor ou recurso desconhecido é registrada e responde 200 para não gerar retentativa infinita.

## 8. Fluxo do checkout

1. Cliente escolhe **Pagamento online (PIX ou cartão)**.
2. O pedido é criado por `place_order`, com preços recalculados no banco. O e-mail é obrigatório quando o pagamento online está selecionado.
3. O frontend chama `infinitepay-create-payment` com `pedidoId` e `trackingToken`.
4. A função valida token, status, configuração e credenciais.
5. Cria ou reutiliza a tentativa idempotente na tabela de pagamentos.
6. Monta o payload com o total do pedido em centavos, dados do cliente/endereço e chama `POST /links`.
7. Salva `checkout_url`, `gateway_order_id` e status `link_criado`.
8. O frontend redireciona automaticamente para o checkout hospedado. O cliente confirma o contato, escolhe PIX ou cartão e paga; no PIX pode ser exigido um código por WhatsApp/SMS antes do QR Code.
9. A InfinitePay envia o webhook e o backend reconsulta `/payment_check`.
10. O pedido só vira `pago` com `paid: true` e valor compatível.
11. Ao voltar pelo `redirect_url`, o frontend chama `infinitepay-sync-payment` com os parâmetros recebidos e mostra o acompanhamento.

## 9. Idempotência e segurança

- `place_order` valida produtos, adicionais, combos, cupom, taxa, pedido mínimo e loja aberta.
- O valor enviado ao gateway é sempre o total salvo no banco.
- Cada tentativa tem `idempotency_key` única e a tabela tem `unique (pedido_id)`.
- Link pendente é reutilizado por até 35 minutos; depois disso um novo link é criado.
- `evento_key` único evita processar a mesma notificação duas vezes.
- Webhook sempre reconsulta a API oficial.
- Notificação com valor divergente não aprova o pedido.
- Pedido cancelado não é marcado como pago, mesmo que o gateway envie `paid`; o evento fica registrado.
- O cliente nunca escreve diretamente em pagamentos, eventos, webhooks ou fila de impressão.
- A API Key nunca vai para o frontend.

## 10. Estados exibidos

| Estado interno | Origem típica |
| --- | --- |
| `pendente` | Link criado ou pagamento ainda não confirmado |
| `em_processamento` | Gateway processando |
| `aprovado` | `paid` ou `settled` confirmado em `/payment_check` |
| `recusado` | `payment_failed` |
| `cancelado` | `canceled` |
| `expirado` | Link expirado |
| `estornado` | `refunded` |
| `erro` | Falha de comunicação ou valor divergente |

## 11. Testes

Sem credenciais:

```bash
npm test
npm run test:integrations
npm run test:sql
```

Com credenciais reais (não existe sandbox):

1. Cadastre `INFINITEPAY_HANDLE` e `INFINITEPAY_API_KEY`.
2. Publique as funções.
3. Clique em **Verificar comunicação**.
4. Ative a integração.
5. Faça uma compra real de valor baixo.
6. Confirme que o webhook alterou o pedido para pago.
7. Estorne a venda pelo app/conta web da InfinitePay.
8. Confirme o evento `refunded`/`estornado` quando disponível.

## 12. Passagem para produção

Checklist:

- [ ] Checkout Integrado habilitado na conta InfinitePay.
- [ ] InfiniteTag e API Key cadastradas no Supabase.
- [ ] `APP_PUBLIC_URL` apontando para o domínio público.
- [ ] As quatro Edge Functions publicadas.
- [ ] Migration base e migration de transição aplicadas.
- [ ] Teste de comunicação aprovado no painel.
- [ ] Integração ativada no painel.
- [ ] Compra real de valor baixo aprovada.
- [ ] Webhook confirmado nos logs.
- [ ] Estorno operado pelo app da InfinitePay.
- [ ] Acompanhamento mostrando status real.
- [ ] Equipe orientada de que PIX manual continua independente.

## 13. Troubleshooting

| Sintoma | Causa | Ação |
| --- | --- | --- |
| Opção online não aparece | Integração inativa ou migration ausente | Verifique `cardapio_exemplo_pagamento_publico` e ative no painel |
| `Credenciais ausentes` | Segredos não cadastrados | `supabase secrets set` |
| `A integração ainda não foi publicada` | Edge Function ausente | Deploy das funções |
| `external_checkout_not_enabled` | Checkout Integrado desligado | Ative em Vendas > Checkout > Configurações |
| Erro 403 na API | API Key e handle de contas diferentes | Use dados da mesma conta |
| Link criado, pedido pendente | Webhook não chegou | Clique em Verificar pagamento e confira os logs |
| Valor divergente | Total da InfinitePay diferente do pedido | Veja o evento no painel; não aprove manualmente |
| `payment_check success=false` | Dados da transação não conferem | Confira `transaction_nsu`, `slug` e `order_nsu` |
| Webhook repetido | Retentativa da InfinitePay | `evento_key` evita reprocessamento |

# Impressão automática ESC/POS — BOM PA POXA

> Impressão Bluetooth no celular/tablet: consulte [`impressao-bluetooth.md`](./impressao-bluetooth.md). O agente local descrito abaixo continua sendo a opção de impressão automática em um PC.

## 1. Objetivo e arquitetura

Todo pedido criado com sucesso entra automaticamente na fila persistente de impressão. A impressão não depende do WhatsApp, do painel aberto ou de `window.print()`.

O desenho é:

```text
Pedido criado no PostgreSQL
        │
        ▼
Trigger enfileira trabalho único
        │
        ▼
cardapio_exemplo_fila_impressao (persistente)
        │
        ▼
Agente local no Windows consulta a fila
        │
        ▼
Impressora térmica ESC/POS 58/80 mm (USB ou rede)
        │
        ▼
Agente marca impresso ou erro
```

O painel administrativo lê a fila, mostra o estado da impressora, permite testar, reprocessar, cancelar e reimprimir.

## 2. Banco de dados

Migration: `supabase/migrations/202611180001_bompapoxa_pagamentos_impressao.sql`.

### Tabelas

- `cardapio_exemplo_impressoras`
  - nome, setor, largura (58/80), ativo, hash do token, último ping e informações do agente.
- `cardapio_exemplo_fila_impressao`
  - pedido, impressora, tipo, setor, `job_key` único, status, largura, snapshot JSON, tentativas, erro, reimpressão e datas.

### Estados da fila

- `pendente`
- `processando`
- `impresso`
- `erro`
- `cancelado`

### Trigger automático

Após inserir um pedido, o trigger cria um trabalho com:

```text
job_key = pedido:<uuid>:principal
tipo = pedido
setor = principal
status = pendente
payload = snapshot completo do pedido
```

O snapshot é atualizado enquanto o trabalho ainda está pendente, porque o pedido é criado antes dos itens e dos valores finais. Assim o cupom inclui itens, adicionais, escolhas de combo, totais e pagamento online.

Se o enfileiramento falhar, o trigger registra um `WARNING` e não impede a criação do pedido. A fila pode ser reabastecida pela reimpressão administrativa.

### RPCs do agente

- `cardapio_exemplo_agente_ping(token, info)` — valida token, atualiza último contato e informações da impressora.
- `cardapio_exemplo_agente_claim_jobs(token, limite)` — retira trabalhos com `FOR UPDATE SKIP LOCKED`, marca `processando`, incrementa tentativas e devolve o payload.
- `cardapio_exemplo_agente_concluir(token, job, sucesso, erro)` — marca `impresso` ou `erro`.

As RPCs são `SECURITY DEFINER`, recebem apenas o token do dispositivo e não dão acesso direto às tabelas.

### RPCs administrativas

- `cardapio_exemplo_criar_impressora(nome, largura, setor)` — gera token aleatório e devolve uma única vez.
- `cardapio_exemplo_regenerar_token_impressora(id)` — invalida o token antigo.
- `cardapio_exemplo_enfileirar_teste(impressora_id)` — cria cupom de teste.
- `cardapio_exemplo_enfileirar_reimpressao(pedido_id)` — cria novo trabalho, marca `reimpressao` e grava `auth.uid()`.
- `cardapio_exemplo_reprocessar_impressao(job_id)` — devolve trabalho com erro/cancelado para pendente.
- `cardapio_exemplo_cancelar_impressao(job_id)` — cancela trabalho.

## 3. Conteúdo do cupom

O formatador fica em `print-agent/format-ticket.mjs`, sem dependência de impressora, o que permite testar 58/80 mm sem hardware.

Conteúdo:

- Nome do estabelecimento.
- `PEDIDO Nº`.
- Data e hora em `America/Bahia`.
- Cliente e telefone.
- Modalidade `ENTREGA` ou `RETIRADA`.
- Itens com quantidade, adicionais, `Inclui:` do combo e observação do item.
- Observações gerais.
- Endereço de entrega completo ou endereço da loja para retirada.
- Forma de pagamento, detalhado como:
  - PIX manual;
  - PIX online (InfinitePay);
  - Cartão online (InfinitePay);
  - Pagamento online (InfinitePay);
  - Cartão na máquina;
  - Dinheiro.
- Situação real do pagamento.
- Troco.
- Subtotal, desconto, taxa e total exatamente como salvos pelo servidor.
- Destaques `*** ENTREGA ***`, `*** RETIRADA ***` e `*** PAGAMENTO PENDENTE ***`.
- Corte de papel.

Larguras:

- 58 mm → 32 colunas.
- 80 mm → 48 colunas.
- Palavras longas e observações são quebradas automaticamente.

## 4. Agente local

Pasta: `print-agent/`.

### Requisitos

- Node.js 20+.
- Driver da impressora instalado no Windows para USB.
- Impressora de rede com porta raw 9100 quando aplicável.
- Token gerado no painel.

### Instalação

```powershell
cd print-agent
npm install
Copy-Item config.example.json agent.config.json
notepad agent.config.json
npm start
```

### Configuração

```json
{
  "supabaseUrl": "https://SEU-PROJETO.supabase.co",
  "supabaseAnonKey": "SUA_CHAVE_ANON_PUBLICA",
  "deviceToken": "TOKEN_GERADO_NO_PAINEL",
  "printerInterface": "tcp://192.168.0.50:9100",
  "printerType": "epson",
  "printerWidthMm": 80,
  "pollIntervalMs": 4000,
  "batchSize": 1
}
```

Para USB:

```json
"printerInterface": "printer:NOME EXATO NO WINDOWS"
```

Descubra o nome com:

```powershell
Get-Printer | Select-Object Name, DriverName, PortName
```

Para rede, teste:

```powershell
Test-NetConnection 192.168.0.50 -Port 9100
```

### Como o agente trata falhas

1. Antes de retirar trabalhos, verifica a conexão com a impressora.
2. Se estiver desconectada/desligada, não retira a fila; os trabalhos continuam `pendente`.
3. Se a conexão cair durante a impressão, marca o trabalho como `erro` com a mensagem.
4. Trabalhos presos em `processando` por mais de 3 minutos podem ser retomados automaticamente pelo próximo ciclo.
5. Não há sobreposição de ciclos: o agente usa uma trava em memória para não imprimir em paralelo.
6. O painel permite reprocessar, cancelar e reimprimir.

## 5. Iniciar no logon do Windows

```powershell
powershell -ExecutionPolicy Bypass -File .\install-windows.ps1
```

O script cria uma tarefa agendada `BOM PA POXA - Impressora` com `ONLOGON`.

Para remover:

```powershell
powershell -ExecutionPolicy Bypass -File .\uninstall-windows.ps1
```

> O Windows normalmente exige que o usuário faça logon para carregar drivers de impressora. Se o computador reiniciar sem logon automático, a tarefa só iniciará após o logon. Configure autologon ou uma política de inicialização de sessão se necessário.

## 6. Painel administrativo

Rota: `/admin/impressao`.

Exibe:

- Estado online/offline da impressora (ping < 90 s).
- Interface reportada pelo agente.
- Largura e setor.
- Último contato.
- Botão de teste.
- Novo token.
- Fila com filtros e contadores.
- Erros e tentativas.
- Reprocessar, cancelar e reimprimir.
- Token exibido uma única vez em modal.

O painel de pedidos também tem **Imprimir novamente** no detalhe do pedido.

## 7. Impressão automática e pagamentos

- O pedido entra na fila logo após ser criado com sucesso.
- O cupom pode sair com `PAGAMENTO PENDENTE` para PIX/cartão online.
- Quando o pagamento é aprovado, o snapshot pendente é atualizado pelo backend antes da impressão, se o agente ainda não retirou o trabalho.
- Pagamentos manuais continuam com situação pendente até o administrador confirmar.
- Nenhum pagamento é marcado como pago por causa da impressão.

## 8. Testes

Sem impressora física, são validados:

```bash
npm run test:agent
npm run test:integrations
npm run test:sql
```

Cobertura:

- cupom de entrega;
- cupom de retirada;
- adicionais;
- combo configurável;
- observações longas;
- desconto;
- troco;
- PIX pendente;
- largura 58 mm;
- largura 80 mm;
- cupom de teste;
- fila automática;
- prevenção de duplicidade por `job_key`;
- token inválido;
- claim/conclusão;
- reimpressão administrativa;
- RLS de fila/impressoras.

Testes físicos necessários quando houver impressora:

- [ ] Imprimir cupom de teste.
- [ ] Imprimir pedido de entrega.
- [ ] Imprimir pedido de retirada.
- [ ] Imprimir com adicionais e observações.
- [ ] Imprimir com 58 mm.
- [ ] Imprimir com 80 mm.
- [ ] Desligar a impressora e criar pedido; religar e conferir retomada.
- [ ] Desconectar durante a impressão e conferir status de erro.
- [ ] Reprocessar pelo painel.
- [ ] Reimprimir e conferir registro de reimpressão.

> Nenhum teste físico foi executado nesta implementação porque não havia impressora conectada.

## 9. QZ Tray

QZ Tray é uma alternativa para lojas que já usam a ponte com certificado. O projeto usa um agente Node próprio para funcionar headless e iniciar no logon. O transporte está isolado em `print-agent/escpos.mjs`; é possível adaptar para QZ Tray ou outro agente sem alterar o checkout, o banco ou o painel.

## 10. Segurança

- Token de dispositivo aleatório, armazenado como hash.
- Token exibido apenas uma vez.
- Agente não tem permissão de inserir trabalhos ou aprovar pagamentos.
- Painel administrativo exige RLS + papel admin.
- Reimpressão registra o usuário solicitante.
- Logs do agente não imprimem segredos.
- `agent.config.json` não deve ser versionado.

## 11. Limitações

- A entrega é **at-least-once**; uma queda entre a impressão e a confirmação pode exigir cancelamento/reimpressão manual.
- Não há divisão automática por setor (cozinha/bebidas/balcão) nesta versão. A estrutura tem `setor` e o payload é completo, mas a configuração de múltiplos setores fica para uma etapa futura.
- Sem impressora física, a homologação de hardware permanece pendente.

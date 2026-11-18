# Agente local de impressão — BOM PA POXA

Este agente roda no computador da loja, consulta a fila `cardapio_exemplo_fila_impressao` no Supabase e envia o cupom em ESC/POS para uma impressora térmica de 58 mm ou 80 mm.

Ele é independente do painel administrativo e não usa `window.print()`. A impressão automática continua funcionando mesmo com o navegador fechado, desde que o agente esteja em execução.

## Requisitos

- Windows 10/11 ou Linux com Node.js 20+.
- Impressora térmica ESC/POS compatível.
- Driver da impressora instalado quando a conexão for USB.
- Acesso à internet para consultar a fila no Supabase.
- Uma impressora cadastrada em **Admin > Impressão**, com token copiado.

## Instalação

```powershell
cd print-agent
npm install
Copy-Item config.example.json agent.config.json
notepad agent.config.json
npm start
```

Preencha:

| Campo | Descrição |
| --- | --- |
| `supabaseUrl` | URL do projeto Supabase, por exemplo `https://tbckigurtfwpgnuhrapr.supabase.co` |
| `supabaseAnonKey` | Chave pública `anon` do mesmo projeto |
| `deviceToken` | Token exibido uma única vez ao cadastrar/regenerar a impressora no painel |
| `printerInterface` | `tcp://IP:9100` para rede ou `printer:NOME NO WINDOWS` para USB/driver |
| `printerType` | `epson` (padrão) ou `star` |
| `printerWidthMm` | `58` ou `80` |
| `pollIntervalMs` | Intervalo de consulta, padrão 4000 ms |
| `batchSize` | Quantidade de trabalhos por ciclo, padrão 1 |

> A chave `anon` é pública. O token da impressora é secreto e fica somente no arquivo local `agent.config.json`, que não deve ser versionado.

## Conexão por rede (Ethernet/Wi-Fi)

1. Dê IP fixo à impressora no roteador.
2. Confirme que a porta raw 9100 está acessível.
3. Teste no PowerShell:

```powershell
Test-NetConnection 192.168.0.50 -Port 9100
```

4. Use no config:

```json
"printerInterface": "tcp://192.168.0.50:9100"
```

## Conexão USB no Windows

1. Instale o driver oficial da impressora.
2. Descubra o nome exato com:

```powershell
Get-Printer | Select-Object Name, DriverName, PortName
```

3. Use no config, preservando espaços:

```json
"printerInterface": "printer:ELGIN i9"
```

O nome precisa ser idêntico ao exibido em `Get-Printer`.

## Iniciar automaticamente no Windows

Com o PowerShell na pasta do agente:

```powershell
powershell -ExecutionPolicy Bypass -File .\install-windows.ps1
```

O script registra uma tarefa agendada `BOM PA POXA - Impressora` para iniciar no logon do usuário atual. Isso é preferível a iniciar como serviço do sistema porque o driver da impressora pode estar associado à sessão do usuário.

Para remover:

```powershell
powershell -ExecutionPolicy Bypass -File .\uninstall-windows.ps1
```

Também é possível usar `run-agent.bat` para teste manual.

## Teste de impressão

1. Cadastre a impressora no painel.
2. Copie o token e salve no `agent.config.json`.
3. Inicie o agente.
4. No painel, clique em **Testar** na impressora.
5. Aguarde o próximo ciclo do agente.

Se a impressora estiver desligada, o trabalho fica pendente. Ao religar/reconectar, o agente retira o trabalho automaticamente.

## Como funciona a fila

- Todo pedido criado com sucesso entra automaticamente na fila via trigger no PostgreSQL.
- O agente valida o token, retira até `batchSize` trabalhos com `SKIP LOCKED` e marca como `processando`.
- Depois de imprimir, marca como `impresso`.
- Se a impressão falhar, marca como `erro` com a mensagem.
- Trabalhos com erro podem ser reprocessados pelo painel.
- Reimpressões são criadas pelo painel, registram o administrador solicitante e ficam marcadas como `reimpressao`.
- Trabalhos presos em `processando` por mais de 3 minutos podem ser retomados pelo próximo ciclo.
- Um mesmo pedido automático usa `job_key` único, evitando duplicação por clique, reload ou reenvio.

A garantia é **at-least-once**: se o agente cair exatamente depois de imprimir e antes de confirmar, o trabalho pode ser retomado. O painel mostra a tentativa e permite cancelar/reimprimir com controle humano.

## Formatação

- 58 mm: 32 colunas.
- 80 mm: 48 colunas.
- Cabeçalho com estabelecimento, número, data e hora.
- Cliente, telefone e modalidade em destaque.
- Itens, adicionais, escolhas de combo e observações.
- Endereço de entrega ou destaque de retirada.
- Forma de pagamento, situação, troco e resumo financeiro.
- Alertas de `ENTREGA`, `RETIRADA` e `PAGAMENTO PENDENTE`.
- Corte de papel ao final.

Os testes de formatação podem ser executados sem impressora:

```powershell
cd print-agent
npm test
```

## QZ Tray

QZ Tray é uma alternativa quando a loja já usa a ponte e possui certificado/assinatura configurados. Este projeto usa um agente Node próprio para permitir execução headless, iniciar no logon e não depender de uma aba aberta. A camada `escpos.mjs` isola o transporte, então é possível trocar o mecanismo sem alterar o checkout ou o banco.

## Segurança

- O token da impressora é armazenado no banco apenas como hash `md5` de um valor aleatório de alta entropia. Ele não é uma senha humana; é um segredo de dispositivo.
- O agente só consegue chamar as RPCs de ping, retirada e conclusão de trabalhos.
- O agente não consegue inserir trabalhos arbitrários nem aprovar pagamentos.
- O painel não expõe o token depois da criação; para obter outro, use **Novo token** e reconfigurar o agente.
- Não use a Service Role Key no agente.
- Não versione `agent.config.json`.

## Solução de problemas

| Sintoma | Verificação |
| --- | --- |
| Agente inicia e encerra | Confira `agent.config.json` e execute `npm start` no terminal |
| `Token de impressora inválido` | Token regenerado ou impressora desativada; gere um novo e atualize o config |
| `Impressora desconectada` | Cabo/rede/energia e nome da impressora no Windows |
| Nada é impresso, mas a fila fica pendente | O agente não conseguiu validar a conexão; veja o log |
| Cupom sai com acentos errados | Ajuste o conjunto de caracteres no driver/impressora para PC860/PC850 |
| Impressão corta no meio | Confirme 58/80 mm no cadastro e no config |
| Tarefa não inicia no boot | O Windows exige logon; use `ONLOGON` ou configure autologon/tarefa equivalente |
| Duplicidade após queda | Use o histórico; o trabalho pode ser cancelado/reimpresso pelo painel |

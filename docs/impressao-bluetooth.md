# Impressão Bluetooth — BOM PA POXA

## 1. O que foi implementado

- Menu **Impressora** no painel administrativo (`/admin/impressao`).
- Conexão com impressora térmica Bluetooth direto pelo aparelho.
- Busca de impressoras, seleção, conexão, desconexão e troca.
- Impressora salva no aparelho (localStorage) e reconexão sem novo pareamento.
- Seleção de papel **58 mm** (32 colunas) ou **80 mm** (48 colunas).
- Cupom formatado em ESC/POS com cabeçalho, pedido, cliente, endereço, itens, adicionais, observações, pagamento e totais.
- Teste de impressão no painel.
- Botão **Imprimir Bluetooth** no detalhe do pedido.
- App Android nativo com Bluetooth Clássico (SPP) e BLE.
- Navegador com impressão BLE via Web Bluetooth.

## 2. Compatibilidade real

| Plataforma | Bluetooth Clássico (SPP) | BLE |
| --- | --- | --- |
| App Android (APK) | Sim | Sim |
| Chrome/Edge no Android | Não | Sim |
| Chrome/Edge no computador | Não | Sim |
| App iOS | Não (iOS não expõe SPP) | Sim |
| Safari/Chrome no iPhone | Não | Não (Web Bluetooth indisponível) |

A impressora precisa aceitar comandos **ESC/POS**. O pareamento Clássico deve ser feito também nas configurações de Bluetooth do Android.

## 3. Como usar no painel

1. Abra **Admin > Impressora**.
2. Escolha o tamanho do papel: **58 mm** ou **80 mm**.
3. Toque em **Procurar impressoras**.
   - No app Android, aparecem as impressoras Clássico pareadas.
   - No navegador, aparecem as impressoras BLE já autorizadas.
4. Toque em **Adicionar BLE** para abrir o seletor de dispositivos Bluetooth.
5. Selecione a impressora e toque em **Conectar**.
6. Use **Testar impressão** para conferir o cupom.
7. No detalhe de um pedido, use **Imprimir Bluetooth**.

A impressora fica salva no aparelho. Ao reabrir a tela, o sistema tenta reconectar automaticamente; se não conseguir, use **Reconectar**.

## 4. App Android

O projeto usa Capacitor para gerar o APK:

```powershell
npm install
npm run build:native
npx cap sync android
cd android
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
.\gradlew.bat assembleDebug
```

APK gerado:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

O APK acima é de **debug** e serve para instalação interna. Para publicar na Play Store, gere um build **release** assinado.

### Plugin nativo

- `android/app/src/main/java/com/bompapoxa/app/ThermalPrinterPlugin.java`
  - Lista impressoras Clássico pareadas.
  - Abre socket SPP (`00001101-0000-1000-8000-00805F9B34FB`).
  - Envia os bytes ESC/POS em Base64.
  - Trata permissões `BLUETOOTH_CONNECT` e `BLUETOOTH_SCAN` no Android 12+.
- BLE nativo: `@capacitor-community/bluetooth-le`.

## 5. Código do frontend

- `src/lib/thermal/ticket.ts` — formatação do cupom 58/80 mm.
- `src/lib/thermal/escpos.ts` — comandos ESC/POS e code page CP850.
- `src/lib/thermal/web-bluetooth.ts` — Web Bluetooth (BLE).
- `src/lib/thermal/native-bluetooth.ts` — BLE e Clássico no app Android.
- `src/lib/thermal/printer.ts` — configuração salva, conexão e envio.
- `src/components/admin/BluetoothPrinter.tsx` — tela de configuração.
- `src/routes/_authenticated/admin/pedidos.tsx` — botão de impressão no pedido.

## 6. Limitações

- Web Bluetooth não acessa Bluetooth Clássico. Para impressoras Clássico, use o APK Android.
- iPhone não permite Bluetooth Clássico para impressoras não certificadas (MFi) e o Safari não implementa Web Bluetooth.
- A impressão depende do aparelho estar com Bluetooth ligado e a impressora ligada/conectada.
- O protocolo ESC/POS pode variar entre fabricantes. Se o cupom sair com caracteres estranhos, ajuste o code page no equipamento ou o driver.
- A reconexão automática depende da permissão de Bluetooth do sistema; se o sistema revogar, selecione a impressora novamente.
- A impressão Bluetooth é separada do agente local. O agente continua disponível para impressão automática em um PC.

## 7. Solução de problemas

| Sintoma | Ação |
| --- | --- |
| “Bluetooth não suportado” no navegador | Use Chrome/Edge no Android/desktop ou instale o APK Android. |
| Impressora Clássico não aparece | Pareie a impressora nas configurações de Bluetooth do Android e toque em Procurar novamente. |
| BLE não encontra a impressora | Verifique se ela está ligada, próxima e se aceita BLE. Use Adicionar BLE. |
| Permissão negada | Autorize o Bluetooth nas configurações do app/navegador. |
| Conecta mas não imprime | Confirme que a impressora aceita ESC/POS e que o papel está configurado em 58/80 mm. |
| Cupom com acentos errados | Ajuste o code page para PC850/PC860 ou use uma impressora compatível. |
| Impressão corta no meio | Confira a largura do papel e a configuração 58/80 mm. |

## 8. Testes realizados

- Formatação de cupom e ESC/POS cobertos por testes automatizados.
- Build web e build nativo concluídos.
- APK Android compilado com sucesso.
- App instalado e aberto no emulador Android; plugin `ThermalPrinter` registrado.
- Homologação física da impressora Bluetooth pendente de equipamento real.

# BOM PA POXA — Cardápio digital

Sistema de cardápio digital e pedidos para a BOM PA POXA, derivado do projeto open-source
[THAAL](https://github.com/rummanhassan13/thaal). A aplicação foi adaptada para português
brasileiro, ganhou identidade visual própria, banco isolado no Supabase e publicação estática
no GitHub Pages.

- Repositório: https://github.com/startupcortex-Hallen/bompapoxa
- Publicação: https://startupcortex-hallen.github.io/bompapoxa/
- Instagram informado: https://www.instagram.com/bom_pa_poxa/

## Estado da entrega

O código está pronto, testado e publicado em
https://startupcortex-hallen.github.io/bompapoxa/.

O banco também foi provisionado no projeto Supabase `tbckigurtfwpgnuhrapr` via Management API:
14 tabelas prefixadas, funções, triggers, 25 policies públicas + 4 policies de Storage, bucket
`cardapio-exemplo-imagens` e um administrador inicial. Nenhuma credencial administrativa,
Service Role Key ou Personal Access Token foi incluída no repositório.

A página pública está no ar e carrega o Supabase real sem erros. Ela exibe o cardápio real da
**BOM PA POXA – Hamburgueria & Kebaberia**, com preços e descrições informados pelo estabelecimento.

## Cardápio real publicado

O ambiente publicado contém:

- 9 produtos reais: 4 hambúrgueres artesanais, 2 kebabs, 1 porção de batata frita 170g, 1 refrigerante e 1 suco de laranja 300ml.
- 4 categorias ativas: Hambúrgueres Artesanais, Kebabs, Porções e Bebidas.
- 4 combos cadastrados: Solteiro e Largado (R$ 40), Casal Fofinho (R$ 75), Enrolado (R$ 35) e Frangolino (oculto até o preço ser definido no painel).
- Combos configuráveis com seleção obrigatória de principal e bebida; o Combo Casal permite 2 kebabs, 2 Ligeirinhos ou 1 Ligeirinho + 1 kebab; o Combo Enrolado não oferece Kebab Tavuk.
- Nenhum adicional fictício foi mantido; a batata aparece com 170g no produto e nos combos.
- Imagens reais para os hambúrgueres, batata, bebidas e combos Solteiro/Casal. Kebab Kafta, Kebab Tavuk, Combo Enrolado e Combo Frangolino usam placeholders ilustrativos e podem ser trocados no painel administrativo.

Arquivos:

- [`supabase/seed-cardapio-real.sql`](supabase/seed-cardapio-real.sql) — fonte do catálogo real publicado.
- [`supabase/seed-demo.sql`](supabase/seed-demo.sql) — conjunto antigo de demonstração; não execute sobre o cardápio real.
- [`supabase/cleanup-demo.sql`](supabase/cleanup-demo.sql) — limpeza do conjunto de demonstração; não execute enquanto o cardápio real estiver ativo.
- As imagens ficam no bucket `cardapio-exemplo-imagens`, nas pastas `produtos/`, `combos/` e `banners/`.

Para trocar fotos, descrições, preços, gramaturas, grupos de escolha ou disponibilidade, use o
painel administrativo. O upload de imagens de produtos e combos continua disponível no CRUD.

### Créditos das imagens

As imagens do cardápio foram obtidas de bancos com licença livre para uso comercial. As fotos reais
não têm marca d'água; os placeholders de kebab/combo têm o selo "IMAGEM ILUSTRATIVA".

- **Unsplash** ([Unsplash License](https://unsplash.com/license)): Ligeirinho da Moto/X-Salada (`photo-1571091718767-18b5b1457add`), Baconzinho Ping/X-Bacon (`photo-1606131731446-5568d87113aa`), Costela Descarada/X-Tudo (`photo-1553979459-d2229ba7433b`), Frango de Quintal (`photo-1568901346375-23c9450c58cd`, placeholder), Batata Frita (`photo-1630384060421-cb20d0e0649d`), Suco de Laranja (`photo-1600271886742-f049cd451bba`), Combo Casal (`photo-1550547660-d9450f859349`, recorte) e banner (`photo-1550317138-10000687a72b`). URLs base: `https://images.unsplash.com/photo-<id>`.
- **Openverse / Rawpixel** (CC0): Refrigerante — imagem "Free coke ice glass black".
- **Openverse / StockSnap** (CC0): Combo Solteiro — imagem "Hamburger Dinner".
- **Imagens ilustrativas locais**: Kebab Kafta, Kebab Tavuk, Combo Enrolado e Combo Frangolino; troque pelas fotos reais no painel.

### Crédito do vídeo

- **Mixkit** ([Mixkit Free License](https://mixkit.co/license/#videoFree)): vídeo do hero "French fries falling in slow motion next to a burger" (`47159`), servido em `public/videos/hero-cinema-720.mp4` e `hero-cinema-360.mp4`; poster em `public/videos/hero-poster.jpg`.

## Identidade visual

O cardápio público foi reestruturado como uma experiência cinematográfica inspirada em streaming:

- Tema escuro (`#090909` / `#141414`), vermelho de conversão (`#E50914`), dourado discreto (`#D6A65C`) e tipografia Bebas Neue + Figtree.
- Hero em tela cheia com vídeo gastronômico em loop, poster/fallback, gradientes cinematográficos e header transparente que ganha fundo sólido ao rolar.
- Coleções horizontais no estilo streaming para destaques, combos e categorias, com cards grandes, quick add, preços em destaque e navegação por setas no desktop.
- Animações de entrada por IntersectionObserver, microinterações de hover/clique e respeito a `prefers-reduced-motion`.
- Busca, modais, sacola, checkout e mapa noturno restilizados sem alterar a lógica de negócio existente.

## O que o sistema faz

### Cardápio público

- Página inicial com identidade da casa, status de funcionamento, entrega, retirada, pedido mínimo e formas de pagamento.
- Categorias, produtos, preços, preços promocionais, ingredientes, fotos opcionais, galeria, destaques e combos.
- Cards de produtos e combos com rotas próprias de detalhe (`/produto/:id` e `/combo/:id`).
- Sacola com sugestões de lanches e bebidas para adicionar sem voltar ao cardápio.
- Botão "Ativar movimento" no hero para iPhone/Modo de Baixa Energia ou usuários com Reduzir Movimento.
- PIX manual com aviso de pagamento pendente, cópia da chave e envio de comprovante pelo WhatsApp.
- Busca por nome, descrição e ingredientes.
- Modal de produto com adicionais por grupo, limites mínimo/máximo, quantidade e observações.
- Sacola persistente no navegador, cupom de desconto e checkout para entrega ou retirada.
- Checkout com CEP automático (ViaCEP), busca de endereço, localização atual e mapa (OpenStreetMap/Photon), com as coordenadas gravadas no pedido.
- O administrador vê a localização do pedido e pode abrir o ponto exato no mapa.
- Pedido validado no PostgreSQL: preços, disponibilidade, adicionais, cupom, taxa de entrega, pedido mínimo e horário de funcionamento são recalculados no servidor.
- Página de acompanhamento do pedido com linha do tempo, detalhes e avaliação após entrega/retirada.
- Avaliações moderadas pelo estabelecimento.

### Painel administrativo

- Visão geral com pedidos do dia, faturamento, pedidos em andamento, produtos disponíveis/indisponíveis, categorias, avaliações pendentes e últimos pedidos.
- CRUD de categorias, produtos, adicionais, combos, banners e cupons.
- Gestão de pedidos com atualização de status, confirmação de pagamento, histórico e exclusão administrativa.
- Moderação de avaliações.
- Configurações de identidade, contato, endereço, entrega, retirada, taxas, pagamentos, status da loja, cores, tipografia e horários.
- Upload de imagens para o Supabase Storage com compressão local em WebP.
- QR code do cardápio para impressão.
- Conta do administrador, redefinição de senha e logout.

## Integrações preparadas (Mercado Pago + impressão)

### Mercado Pago

- PIX online via **Checkout Transparente / Orders API**, com QR Code e copia e cola no checkout e no acompanhamento.
- Cartão online via **Checkout Pro**, sem dados de cartão no frontend.
- Criação de pagamento, consulta e webhook em **Supabase Edge Functions**.
- Webhook com validação de assinatura HMAC, reconsulta obrigatória da API oficial e idempotência.
- Segredos somente no servidor: `MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_PUBLIC_KEY`, `MERCADOPAGO_WEBHOOK_SECRET` e `MERCADOPAGO_ENVIRONMENT`.
- Painel em **Admin > Pagamentos**, com ambiente, credenciais presentes/ausentes (sem valores), teste de comunicação, webhook, últimos pagamentos e eventos.
- Pagamentos manuais preservados: dinheiro, troco, cartão na máquina, PIX manual e comprovante por WhatsApp.
- Guia: [`docs/mercadopago.md`](docs/mercadopago.md).

A integração está pronta para receber credenciais oficiais, mas **não foi homologada com pagamentos reais** neste repositório. Nenhuma credencial foi incluída e nenhum teste Sandbox real foi executado sem as chaves.

### Impressão automática ESC/POS

- Fila persistente `cardapio_exemplo_fila_impressao`, alimentada por trigger após a criação bem-sucedida do pedido.
- Snapshot completo do pedido, incluindo itens, adicionais, escolhas de combo, observações, endereço, pagamento, desconto e troco.
- Agente local Node.js em `print-agent/`, com ESC/POS para 58 mm e 80 mm, USB via driver Windows ou rede TCP 9100.
- Agente verifica a impressora antes de retirar a fila; se estiver desligada, os trabalhos permanecem pendentes.
- Claim com `FOR UPDATE SKIP LOCKED`, token de dispositivo com hash, `job_key` único, tentativas, erro, reprocessamento e reimpressão registrada.
- Painel em **Admin > Impressão**, com estado online/offline, teste, fila, erros, cancelamento e reimpressão.
- Reimpressão também disponível no detalhe do pedido.
- Guia: [`docs/impressao.md`](docs/impressao.md).

A formatação e o protocolo foram testados sem impressora física. A homologação de hardware permanece pendente até conectar o equipamento.

## Stack

- React 19 + TypeScript
- Vite 8
- TanStack Router (SPA, file-based routes)
- Tailwind CSS 4
- TanStack Query
- Supabase JS (Auth, PostgREST, Storage)
- Supabase Edge Functions (Deno) para Mercado Pago
- Mercado Pago Orders API (PIX) e Checkout Pro (cartão)
- Agente Node.js + ESC/POS para impressão térmica
- Lucide Icons, Sonner
- Leaflet + OpenStreetMap, Photon e ViaCEP para endereço no checkout
- QR Code Styling
- Vitest + Node Test Runner

O THAAL original usava TanStack Start com SSR. Para publicar no GitHub Pages, a aplicação foi
convertida para SPA estática; as consultas que dependiam de server functions passaram a usar o
cliente Supabase diretamente, sempre protegidas por RLS. O banco, a autenticação e o storage
continuam no Supabase.

## Estrutura

```text
src/
  components/
    admin/           componentes compartilhados do painel
    brand/           fallback tipográfico da marca
    layout/          layouts público, administrativo e de autenticação
    menu/            cardápio público, produto, sacola, checkout e acompanhamento
    ui/              botões, modais, formulários e feedback
  hooks/             carrinho persistente
  integrations/      cliente Supabase
  lib/               tipos, consultas, mutações, formato, horários, tema e utilidades
  routes/            rotas TanStack Router
supabase/
  migrations/        migrations versionadas do BOM PA POXA
  README.md          passo a passo do banco, RLS, storage e administrador
```

## Desenvolvimento local

Requisitos: Node.js 22 ou superior.

```sh
npm install
cp .env.example .env.local
npm run dev
```

No Windows, crie `.env.local` manualmente com:

```env
VITE_SUPABASE_URL="https://tbckigurtfwpgnuhrapr.supabase.co"
VITE_SUPABASE_ANON_KEY="sua-chave-publica-anon"
```

A aplicação local fica em `http://localhost:5173/bompapoxa/` porque o build usa o caminho base
`/bompapoxa/`.

Scripts:

| Script | Descrição |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção em `dist/` |
| `npm run preview` | Pré-visualização do build |
| `npm run typecheck` | Verificação TypeScript |
| `npm run lint` | ESLint |
| `npm test` | Testes unitários de UI/utilidades |
| `npm run test:integrations` | Testes do núcleo Mercado Pago (HMAC, status, payloads) e do cupom ESC/POS |
| `npm run test:agent` | Testes de formatação do agente de impressão |
| `npm run test:sql` | Valida as migrations em PostgreSQL local (PGlite) |
| `npm run format` | Prettier |

## Variáveis de ambiente

| Variável | Uso |
| --- | --- |
| `VITE_SUPABASE_URL` | URL pública do projeto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Chave pública `anon`/publishable |

A chave `anon` é pública por definição e pode ser usada no frontend. Nunca inclua
`SUPABASE_SERVICE_ROLE_KEY`, senha do banco, Personal Access Token ou qualquer segredo no
repositório. O arquivo `.env.production` contém apenas a URL e a chave pública necessárias para
o build do GitHub Pages.

## Supabase

- Project ID: `tbckigurtfwpgnuhrapr`
- URL: `https://tbckigurtfwpgnuhrapr.supabase.co`
- Prefixo obrigatório de todos os objetos do cardápio: `cardapio_exemplo_`
- Bucket: `cardapio-exemplo-imagens`
- Migrations:
  - `supabase/migrations/202611170001_bompapoxa.sql` — schema principal, RLS, RPCs, Storage e seed inicial.
  - `supabase/migrations/202611170002_bompapoxa_endereco_mapa.sql` — coordenadas de entrega e evolução das RPCs de pedido.
  - `supabase/migrations/202611170003_bompapoxa_tipografia_cinema.sql` — opção de tipografia `bebas_figtree` na configuração pública.
  - `supabase/migrations/202611170004_bompapoxa_combos_configuraveis.sql` — grupos e opções de escolha para combos configuráveis.
  - `supabase/migrations/202611180001_bompapoxa_pagamentos_impressao.sql` — pagamentos online, eventos, webhooks, impressoras e fila de impressão.

A migration não altera nem remove objetos de outros aplicativos do mesmo projeto. Ela cria
tabelas, tipos, funções, triggers, índices, políticas RLS, bucket e dados iniciais mínimos com
nomes prefixados.

Consulte [`supabase/README.md`](supabase/README.md) para executar e validar.

## Segurança

- RLS habilitado em todas as tabelas do cardápio.
- Leitura pública restrita a configurações, categorias ativas, produtos ativos, adicionais disponíveis, combos ativos, banners ativos, horários e avaliações aprovadas.
- Pedidos, cupons e dados administrativos não são legíveis por visitantes anônimos.
- A criação de pedido, consulta por token, validação de cupom e envio de avaliação passam por funções `SECURITY DEFINER` com validação no servidor.
- O perfil de administrador é protegido por trigger: usuários autenticados não conseguem se promover a administrador.
- Uploads exigem perfil administrador e ficam restritos ao bucket e às pastas permitidas.
- Não há cadastro público de administradores na interface.

## Identidade visual

O Instagram não disponibilizou o conteúdo do perfil sem autenticação durante a execução. Por
isso, a identidade aplicada é provisória e documentada, não uma afirmação de extração do perfil:

- terracota `#B23A2A`
- creme `#FAF5EC`
- areia `#F1E3CF`
- dourado `#E8A33D`
- cacau `#2A1710`
- tipografia Fraunces + Figtree

As cores, a tipografia, a logo e a capa são configuráveis pelo painel. Enquanto a logo oficial
não for enviada, o sistema usa um fallback tipográfico com o nome BOM PA POXA. Nenhuma imagem
aleatória foi usada como produto real.

## Publicação no GitHub Pages

O workflow em `.github/workflows/deploy.yml` executa typecheck, lint, testes e build a cada push
na branch `main`, depois publica `dist/` no GitHub Pages.

Configuração necessária no GitHub:

1. Acessar `Settings > Pages`.
2. Em `Build and deployment`, escolher `Source: GitHub Actions`.
3. Garantir que a branch de publicação seja `main` (ou ajustar o workflow).
4. Fazer push do repositório.

O build usa:

- base `/bompapoxa/`
- fallback de rotas em `public/404.html`
- `.nojekyll`
- `og:image` e links absolutos para `https://startupcortex-hallen.github.io/bompapoxa/`

Se o repositório for renomeado, atualize `base` em `vite.config.ts`, o script de `public/404.html`,
o `index.html` e as URLs absolutas do README.

## Testes realizados

- `npm run typecheck`
- `npm run lint`
- `npm test` — 27 testes unitários
- `npm run test:integrations` — 12 testes de núcleo Mercado Pago e formatação ESC/POS
- `npm run test:sql` — migration executada em PostgreSQL via PGlite com stubs de `auth` e `storage`, incluindo pedido completo, cupom, itens, histórico, promoção de administrador, RPC de combos e políticas RLS.
- `npm run build`
- Migration aplicada no Supabase real via Management API: 14 tabelas, 25 policies públicas + 4 de Storage, bucket e administrador inicial verificados.
- Login real do administrador no site publicado e leitura do dashboard com dados reais.
- CRUD real de categoria: criação e exclusão com confirmação.
- CRUD real de produto com upload de imagem no Storage, exibição no cardápio público sem novo deploy e exclusão com limpeza do objeto.
- Pedido real anônimo via RPC: produto, cupom, cálculo de subtotal/desconto/total, criação, consulta por token e rejeição de token incorreto.
- Os dados dos testes de pedido, categoria e produto foram removidos; o conjunto de demonstração permanece intencionalmente.
- Seed real aplicado: 9 produtos, 4 categorias ativas, 4 combos (3 publicados + Frangolino oculto até preço), 6 grupos e 13 opções de escolha, sem adicionais fictícios.
- Página pública validada com produtos reais, combos configuráveis e 17 imagens carregadas (0 quebradas); Combo Solteiro R$ 40, Casal R$ 75 e Enrolado R$ 35; Combo Enrolado sem Kebab Tavuk; Combo Frangolino oculto.
- Teste de carrinho/pedido: Combo Casal com 2 Ligeirinhos e 2 refrigerantes, total R$ 75, escolhas persistidas no pedido e no WhatsApp; pedido de teste removido e sequência restaurada.
- Admin live validado: catálogo real, combos configuráveis, grupos/opções de escolha e upload de imagens disponível para substituir os placeholders.
- Redesign cinematográfico validado localmente em Chrome/Playwright desktop (1440x1000) e mobile fresh (390x844): vídeo do hero com fallback, header transparente/sólido, coleções horizontais, busca, quick add, modais, sacola, cupom, checkout com mapa escuro e reduced-motion; sem overflow nem erros de console.
- Login administrativo e telas de produtos, combos e configurações validadas com a nova paleta Cinema e a tipografia Bebas Neue disponíveis no painel.
- Sacola mobile validada com altura dinâmica, rolagem da lista, botão "Continuar" sempre visível e controle de quantidade compacto.
- Checkout live com CEP automático (ViaCEP), busca de endereço (Photon), localização atual (geolocalização) e mapa Leaflet/OpenStreetMap.
- Coordenadas gravadas no pedido e link "Abrir localização no mapa" validado no painel administrativo.
- Dashboard de vendas mostrando pagamentos pendentes: R$ 55,90 antes da confirmação e R$ 0,00 depois de "Marcar pago".
- CRUD live de adicionais, combos, banners e cupons: criação e exclusão.
- Fluxo real de pedido com mudança de status, envio de avaliação, aprovação, exclusão da avaliação e exclusão do pedido.
- Configurações e horários salvos pela interface real do painel.
- Cards, modais, sacola, checkout, acompanhamento, login, painel, 404 e layout mobile também foram validados em Chrome headless com Supabase simulado.
- Fluxo publicado sem erros de console após a ativação do banco.
- GitHub Actions concluído com sucesso em typecheck, lint, testes, validação SQL, build e deploy.
- Layout mobile sem overflow horizontal.

## Limitações e ações manuais

- Trocar a senha do administrador inicial em **Minha conta > Segurança** e alterar o e-mail no Supabase (**Authentication > Users**), pois o usuário inicial usa um e-mail reservado de provisionamento.
- Configurar `Site URL` e `Redirect URLs` no Supabase Auth para o domínio do GitHub Pages e para o ambiente local.
- O catálogo real já está aplicado. Use o painel para trocar os placeholders de Kebab Kafta, Kebab Tavuk, Combo Enrolado e Combo Frangolino pelas fotos oficiais. Não execute `cleanup-demo.sql` enquanto o cardápio real estiver ativo.
- O projeto não integra gateway de pagamento; o pagamento é registrado e conferido manualmente.
- O painel atualiza pedidos por polling a cada 15 segundos; não foi adicionada publicação Realtime para evitar alterações em objetos compartilhados do Supabase.
- O Personal Access Token usado no provisionamento foi fornecido na conversa e não foi gravado no repositório; recomenda-se revogá-lo ou rotacioná-lo após a configuração.
- A licença do THAAL original deve ser confirmada antes de redistribuir o código.

## Créditos e licença

Base funcional e arquitetura original: [THAAL](https://github.com/rummanhassan13/thaal), de
Rumman Hassan. Adaptação para BOM PA POXA, tradução, identidade, isolamento de banco e publicação
estática realizados neste repositório.

O THAAL original não declara uma licença de código aberto; os direitos permanecem reservados ao
autor original. Esta adaptação foi realizada para o repositório BOM PA POXA a pedido do
responsável pelo estabelecimento. Antes de redistribuir o código, confirme a autorização com o
autor original.

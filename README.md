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

A página pública está no ar e carrega o Supabase real sem erros. Ela exibe um cardápio
demonstrativo de hamburgueria, com fotografias reais de alimentos e dados provisórios, para
validar a experiência enquanto os dados reais não chegam.

## Dados de demonstração

O ambiente publicado contém:

- 12 produtos demonstrativos com imagem principal + 2 imagens de detalhe cada, distribuídos em 5 categorias (Burgers, Hot Dogs, Porções, Bebidas e Sobremesas), 8 adicionais, 2 combos, banner, cupom `DEMO10` e horários provisórios.
- Fotografias reais de alimentos com licenças livres para uso comercial, sem marcas d'água, textos ou logos. São imagens ilustrativas do conjunto demonstrativo, não fotos dos produtos de um estabelecimento real.
- Logo mantida no fallback tipográfico "BOM PA POXA" até o envio da arte oficial.
- Preços, descrições, contatos e endereço são provisórios. O endereço permanece vazio.

Arquivos:

- [`supabase/seed-demo.sql`](supabase/seed-demo.sql) — recria o conjunto de demonstração.
- [`supabase/cleanup-demo.sql`](supabase/cleanup-demo.sql) — remove produtos, combos, banner, cupom e restaura as configurações neutras.
- As imagens ficam no bucket `cardapio-exemplo-imagens`, nas pastas `produtos/`, `combos/` e `banners/`, com nomes descritivos (por exemplo, `smash-duplo-1.jpg`).

Para substituir pelo conteúdo real, edite ou exclua os itens pelo painel e envie a logo, as fotos
e os dados verdadeiros. Também é possível executar `cleanup-demo.sql` e cadastrar tudo do zero.
Consulte [`supabase/README.md`](supabase/README.md) para os comandos e o procedimento de
autenticação.

### Créditos das imagens

As fotografias demonstrativas foram obtidas de bancos com licença livre para uso comercial:

- **Unsplash** ([Unsplash License](https://unsplash.com/license)): Smash Duplo (`photo-1568901346375-23c9450c58cd`), X-Salada (`photo-1571091718767-18b5b1457add`), X-Bacon (`photo-1606131731446-5568d87113aa`), X-Tudo (`photo-1553979459-d2229ba7433b`), Batata Frita (`photo-1630384060421-cb20d0e0649d`), Batata Cheddar (`photo-1573080496219-bb080dd4f877`), Frango Crocante (`photo-1626645738196-c2a7c87a8f58`), Suco de Laranja (`photo-1600271886742-f049cd451bba`), Brownie com Calda (`photo-1606313564200-e75d5e30476c`), Combo Casal (`photo-1550547660-d9450f859349`, recorte) e banner (`photo-1550317138-10000687a72b`). URLs base: `https://images.unsplash.com/photo-<id>`.
- **Wikimedia Commons** (CC0): Hot Dog Completo — [Plant-based hot dog with fried onion, French fries, and apple sparkling](https://commons.wikimedia.org/wiki/File:Plant-based_hot_dog_with_fried_onion,_French_fries,_and_apple_sparkling_-_IKEA_Southampton_2025-12-29.jpg).
- **Openverse / Rawpixel** (CC0): Refrigerante — imagem "Free coke ice glass black".
- **Openverse / Public Domain Pictures** (CC0): Milkshake de Morango — imagem "Strawberry milkshake in a mason jar topped with whipped cream".
- **Openverse / StockSnap** (CC0): Combo Individual — imagem "Hamburger Dinner".

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

## Stack

- React 19 + TypeScript
- Vite 8
- TanStack Router (SPA, file-based routes)
- Tailwind CSS 4
- TanStack Query
- Supabase JS (Auth, PostgREST, Storage)
- Lucide Icons, Sonner, Framer Motion
- Leaflet + OpenStreetMap, Photon e ViaCEP para endereço no checkout
- QR Code Styling
- Vitest

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
| `npm test` | Testes unitários |
| `npm run test:sql` | Valida a migration em PostgreSQL local (PGlite) |
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
- `npm test` — 22 testes unitários
- `npm run test:sql` — migration executada em PostgreSQL via PGlite com stubs de `auth` e `storage`, incluindo pedido completo, cupom, itens, histórico, promoção de administrador, RPC de combos e políticas RLS.
- `npm run build`
- Migration aplicada no Supabase real via Management API: 14 tabelas, 25 policies públicas + 4 de Storage, bucket e administrador inicial verificados.
- Login real do administrador no site publicado e leitura do dashboard com dados reais.
- CRUD real de categoria: criação e exclusão com confirmação.
- CRUD real de produto com upload de imagem no Storage, exibição no cardápio público sem novo deploy e exclusão com limpeza do objeto.
- Pedido real anônimo via RPC: produto, cupom, cálculo de subtotal/desconto/total, criação, consulta por token e rejeição de token incorreto.
- Os dados dos testes de pedido, categoria e produto foram removidos; o conjunto de demonstração permanece intencionalmente.
- Seed de demonstração aplicado: 12 produtos com 3 imagens cada, 5 categorias, 8 adicionais, 2 combos, banner, cupom e horários.
- Página pública live validada com 20 imagens carregadas (0 quebradas), modal de produto com galeria, adicional, sacola, cupom, checkout e layout mobile sem overflow. O Storage contém 39 imagens demonstrativas (36 de produtos + 2 de combos + 1 banner).
- Teste final em emulador mobile fresh (Chrome/iPhone 390x844): login administrativo, pedido real com combo + adicional + cupom, painel de produtos, combos, banner e pedido. O pedido de teste foi removido e a sequência restaurada.
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
- Substituir os dados de demonstração pelos dados reais: logo oficial, fotos, produtos, preços, adicionais, combos, banners, cupons e horários. Use `supabase/cleanup-demo.sql` para limpar o conjunto provisório e remova as imagens demonstrativas das pastas `produtos/`, `combos/` e `banners/` no Storage.
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

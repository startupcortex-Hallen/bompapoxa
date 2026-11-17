# BOM PA POXA — Cardápio digital

Sistema de cardápio digital e pedidos para a BOM PA POXA, derivado do projeto open-source
[THAAL](https://github.com/rummanhassan13/thaal). A aplicação foi adaptada para português
brasileiro, ganhou identidade visual própria, banco isolado no Supabase e publicação estática
no GitHub Pages.

- Repositório: https://github.com/startupcortex-Hallen/bompapoxa
- Publicação: https://startupcortex-hallen.github.io/bompapoxa/
- Instagram informado: https://www.instagram.com/bom_pa_poxa/

## Estado da entrega

O código está pronto para build, testes e publicação. A versão publicada está em
https://startupcortex-hallen.github.io/bompapoxa/.

A ativação do banco depende de uma ação manual no Supabase, porque a chave fornecida é a chave
pública `anon` e não permite executar DDL (criação de tabelas, funções e políticas). Nenhuma
credencial administrativa foi incluída no repositório. Enquanto a migration não for executada,
a página pública exibe o estado de configuração ("Cardápio em preparação") em vez do cardápio.

Para o sistema funcionar em produção, execute a migration descrita em
[`supabase/README.md`](supabase/README.md) e crie o primeiro administrador.

## O que o sistema faz

### Cardápio público

- Página inicial com identidade da casa, status de funcionamento, entrega, retirada, pedido mínimo e formas de pagamento.
- Categorias, produtos, preços, preços promocionais, ingredientes, fotos opcionais, galeria, destaques e combos.
- Busca por nome, descrição e ingredientes.
- Modal de produto com adicionais por grupo, limites mínimo/máximo, quantidade e observações.
- Sacola persistente no navegador, cupom de desconto e checkout para entrega ou retirada.
- Pedido validado no PostgreSQL: preços, disponibilidade, adicionais, cupom, taxa de entrega, pedido mínimo e horário de funcionamento são recalculados no servidor.
- Página de acompanhamento do pedido com linha do tempo, detalhes e avaliação após entrega/retirada.
- Avaliações moderadas pelo estabelecimento.

### Painel administrativo

- Visão geral com pedidos do dia, faturamento, pedidos em andamento, produtos disponíveis/indisponíveis, categorias, avaliações pendentes e últimos pedidos.
- CRUD de categorias, produtos, adicionais, combos, banners e cupons.
- Gestão de pedidos com atualização de status, confirmação de pagamento e histórico.
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
  migrations/        migration única do BOM PA POXA
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
- Migration: `supabase/migrations/202611170001_bompapoxa.sql`

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
- `npm run test:sql` — migration executada em PostgreSQL via PGlite com stubs de `auth` e `storage`, incluindo pedido completo, cupom, itens, histórico, promoção de administrador e políticas RLS.
- `npm run build`
- Fluxo de interface validado em Chrome headless com respostas simuladas do Supabase: cardápio desktop e mobile, busca, produto, adicional, sacola, checkout, confirmação, acompanhamento, login, redirecionamento do painel e página 404.
- Nenhum erro de console no fluxo testado.
- Layout mobile sem overflow horizontal.

## Limitações e ações manuais

- Executar a migration no Supabase (a chave anon não permite DDL).
- Criar o usuário administrador no Supabase Auth e promovê-lo com `cardapio_exemplo_promover_admin`.
- Configurar `Site URL` e `Redirect URLs` no Supabase Auth para o domínio do GitHub Pages e para o ambiente local.
- Enviar a logo oficial, as fotos reais e os produtos reais pelo painel.
- O projeto não integra gateway de pagamento; o pagamento é registrado e conferido manualmente.
- O painel atualiza pedidos por polling a cada 15 segundos; não foi adicionada publicação Realtime para evitar alterações em objetos compartilhados do Supabase.
- O push para o GitHub e a execução da migration dependem de credenciais que não foram fornecidas neste ambiente.

## Créditos e licença

Base funcional e arquitetura original: [THAAL](https://github.com/rummanhassan13/thaal), de
Rumman Hassan. Adaptação para BOM PA POXA, tradução, identidade, isolamento de banco e publicação
estática realizados neste repositório.

O THAAL original não declara uma licença de código aberto; os direitos permanecem reservados ao
autor original. Esta adaptação foi realizada para o repositório BOM PA POXA a pedido do
responsável pelo estabelecimento. Antes de redistribuir o código, confirme a autorização com o
autor original.

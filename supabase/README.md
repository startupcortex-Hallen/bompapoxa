# Supabase — BOM PA POXA

## Visão geral

Este projeto usa o projeto Supabase `tbckigurtfwpgnuhrapr`, que já pertence a outros aplicativos.
Por isso, **todos** os objetos criados pelo cardápio usam o prefixo `cardapio_exemplo_`:

- tabelas `cardapio_exemplo_*`
- tipos `cardapio_exemplo_*`
- funções `cardapio_exemplo_*`
- triggers `cardapio_exemplo_tg_*`
- índices `cardapio_exemplo_*_idx`
- políticas RLS com nomes prefixados
- bucket `cardapio-exemplo-imagens`

A migration não remove, renomeia ou altera tabelas de outros aplicativos. Ela apenas cria
objetos novos e usa `IF NOT EXISTS`, `ON CONFLICT DO NOTHING` e `CREATE OR REPLACE` quando
adequado.

## Migration

As migrations já foram aplicadas no projeto `tbckigurtfwpgnuhrapr` via Management API. Foram
verificados 14 tabelas `cardapio_exemplo_*`, as funções, os triggers, as políticas, o bucket
`cardapio-exemplo-imagens` e as colunas de coordenadas em `cardapio_exemplo_pedidos`.

Para reaplicar em outro projeto ou recuperar o ambiente:

1. Abra o projeto no Supabase.
2. Vá em **SQL Editor**.
3. Execute `supabase/migrations/202611170001_bompapoxa.sql` e, em seguida,
   `supabase/migrations/202611170002_bompapoxa_endereco_mapa.sql`.
5. Confira em **Table Editor** as tabelas `cardapio_exemplo_*`.
6. Confira em **Storage** o bucket `cardapio-exemplo-imagens`.
7. Confira em **Database > Policies** as políticas prefixadas.

A migration pode ser executada novamente com segurança para recriar funções, triggers, índices e
políticas. Ela não apaga dados.

## Administrador

O sistema não tem cadastro público de administrador. Já existe um administrador inicial de
provisionamento no projeto, com e-mail reservado e senha temporária. Altere a senha em
**Minha conta > Segurança** e o e-mail em **Authentication > Users** no Supabase.

Para criar ou promover outro administrador:

1. Em **Authentication > Users**, crie um usuário com e-mail e senha.
2. No SQL Editor, execute:

```sql
select public.cardapio_exemplo_promover_admin('seu-email@exemplo.com');
```

3. Acesse `/bompapoxa/login` e entre com esse usuário.

O trigger `cardapio_exemplo_guardar_papel_perfil` impede que um usuário autenticado comum altere
o próprio papel para `admin`. A função de promoção é executável apenas por `service_role`/postgres.

Para remover o acesso, use o SQL Editor (com credencial administrativa) para atualizar o papel
para `cliente` ou excluir o perfil.

## Dados de demonstração

O ambiente publicado usa o arquivo [`seed-demo.sql`](seed-demo.sql) para criar um cardápio
ilustrativo:

- 10 produtos com imagem principal + 2 imagens de detalhe cada, 8 adicionais, 2 combos, banner, cupom `DEMO10` e horários provisórios.
- Imagens com o selo "IMAGEM ILUSTRATIVA • DEMONSTRAÇÃO", sem fotos reais de produtos.
- Logo mantida no fallback tipográfico até o envio da arte oficial.
- Configuração de status forçada para "aberto" e textos indicando demonstração.

Para remover o conjunto e cadastrar os dados reais, execute [`cleanup-demo.sql`](cleanup-demo.sql)
e depois apague as imagens `demo-*` no bucket `cardapio-exemplo-imagens`. A limpeza não remove o
administrador.

## Configuração de autenticação

Em **Authentication > URL Configuration**:

- **Site URL**: `https://startupcortex-hallen.github.io/bompapoxa/`
- **Redirect URLs**:
  - `https://startupcortex-hallen.github.io/bompapoxa/redefinir-senha`
  - `http://localhost:5173/bompapoxa/redefinir-senha`

Se o domínio ou o caminho base mudar, atualize essas URLs e o build.

O cadastro público pode permanecer desabilitado em **Authentication > Providers > Email** se você
quiser que apenas administradores criados manualmente acessem o painel. O cardápio público não
exige login.

## Tabelas criadas

| Tabela | Finalidade |
| --- | --- |
| `cardapio_exemplo_perfis` | Perfil e papel (`admin`/`cliente`) vinculado a `auth.users` |
| `cardapio_exemplo_configuracoes` | Identidade, contato, entrega, pagamentos, cores e status da loja |
| `cardapio_exemplo_horarios` | Funcionamento por dia da semana, com suporte a virada de meia-noite |
| `cardapio_exemplo_categorias` | Categorias do cardápio |
| `cardapio_exemplo_produtos` | Produtos, preços, promoções, fotos, ingredientes e disponibilidade |
| `cardapio_exemplo_adicionais` | Complementos por produto, com grupos, obrigatoriedade e limites |
| `cardapio_exemplo_combos` | Combos e preço especial |
| `cardapio_exemplo_combo_itens` | Produtos e quantidades de cada combo |
| `cardapio_exemplo_banners` | Banners e capas |
| `cardapio_exemplo_cupons` | Cupons percentuais ou de valor fixo |
| `cardapio_exemplo_pedidos` | Pedidos, cliente, endereço, coordenadas, valores e status |
| `cardapio_exemplo_itens_pedido` | Itens do pedido com preço e adicionais congelados |
| `cardapio_exemplo_historico_pedidos` | Histórico de status |
| `cardapio_exemplo_avaliacoes` | Avaliações com moderação |

## Funções principais

| Função | Acesso | Finalidade |
| --- | --- | --- |
| `cardapio_exemplo_place_order` | anon/authenticated | Cria pedido com preços e disponibilidade validados no banco; aceita latitude/longitude no JSON de endereço |
| `cardapio_exemplo_get_pedido` | anon/authenticated | Consulta pedido somente com id + token privado |
| `cardapio_exemplo_validar_cupom` | anon/authenticated | Valida cupom e calcula desconto |
| `cardapio_exemplo_submit_avaliacao` | anon/authenticated | Envia avaliação vinculada ao token do pedido |
| `cardapio_exemplo_esta_aberto` | anon/authenticated | Calcula status pelo fuso `America/Bahia` |
| `cardapio_exemplo_e_admin` | authenticated | Verifica papel de administrador |
| `cardapio_exemplo_promover_admin` | service_role | Promove usuário por e-mail |
| `cardapio_exemplo_admin_salvar_combo` | authenticated/admin | Salva combo e itens de forma atômica |

## RLS resumida

- Público: lê configurações, categorias ativas, produtos ativos, adicionais disponíveis, combos ativos, itens de combos ativos, banners ativos, horários e avaliações aprovadas.
- Público: não lê pedidos, itens, histórico, cupons nem perfis; pedidos são acessados apenas por RPC com token.
- Cliente autenticado comum: vê apenas o próprio perfil; não administra o cardápio.
- Administrador: gerencia todas as tabelas do cardápio por políticas que verificam `cardapio_exemplo_e_admin()`.
- Storage: leitura pública das imagens; escrita, atualização e exclusão apenas para administrador, limitadas ao bucket e às pastas `logo`, `banners`, `categorias`, `produtos` e `combos`.

## Validação realizada

A migration também é executada automaticamente por `npm run test:sql` em PostgreSQL (PGlite) com
stubs de `auth` e `storage`. Os testes cobrem:

- criação das 14 tabelas;
- seed de configurações, horários, categorias e banner;
- promoção de administrador;
- criação de produto, adicional e cupom;
- pedido de entrega com adicional e cupom;
- cálculo de subtotal, desconto e total no servidor;
- histórico automático de status;
- consulta por token;
- leitura anônima somente do que é público;
- negação de escrita anônima e de cliente comum;
- negação de autopromoção a administrador;
- upload de storage permitido apenas para administrador.

Validação live no projeto Supabase real:

- migration aplicada via Management API;
- 14 tabelas, 25 policies públicas + 4 de Storage, bucket e administrador verificados;
- login real do administrador no site publicado;
- criação e exclusão de categoria;
- criação de produto com upload de imagem no Storage;
- produto visível no cardápio público sem novo deploy;
- exclusão do produto e do objeto de imagem;
- pedido anônimo real com cupom, cálculo de valores, consulta por token e rejeição de token incorreto;
- limpeza de todos os dados de teste.

## O que ainda depende de ação manual

- Trocar a senha do administrador inicial em **Minha conta > Segurança**.
- Alterar o e-mail do administrador inicial em **Authentication > Users** no Supabase.
- Configurar as URLs de autenticação.
- Substituir o conjunto de demonstração por logo, capa, fotos, produtos, adicionais, combos, banners, cupons e horários reais. Use `cleanup-demo.sql` e remova as imagens `demo-*` do Storage.
- Se desejar tempo real, habilitar a publicação Realtime das tabelas `cardapio_exemplo_pedidos` e `cardapio_exemplo_historico_pedidos` no painel; o frontend usa polling a cada 15 segundos por padrão.
- Revogar ou rotacionar o Personal Access Token usado no provisionamento, pois ele foi compartilhado na conversa e não foi gravado no repositório.

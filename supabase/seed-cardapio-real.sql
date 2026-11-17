-- CARDÁPIO REAL — BOM PA POXA HAMBURGUERIA & KEBABERIA
-- Substitui o catálogo demonstrativo pelos produtos reais informados pelo estabelecimento.
-- As imagens dos kebabs e dos combos Enrolado/Frangolino são ilustrativas e podem ser trocadas no painel.

delete from public.cardapio_exemplo_combo_opcoes;
delete from public.cardapio_exemplo_combo_grupos;
delete from public.cardapio_exemplo_combo_itens;
delete from public.cardapio_exemplo_combos;
delete from public.cardapio_exemplo_adicionais;
delete from public.cardapio_exemplo_produtos where id::text like 'd0000000-%';

update public.cardapio_exemplo_categorias
set nome = 'Hambúrgueres Artesanais',
    descricao = 'Burgers artesanais de 150g, preparados na chapa.',
    ordem = 0,
    ativo = true,
    destaque = true
where nome in ('Pratos', 'Burgers');

insert into public.cardapio_exemplo_categorias (nome, descricao, ordem, ativo, destaque)
select 'Hambúrgueres Artesanais', 'Burgers artesanais de 150g, preparados na chapa.', 0, true, true
where not exists (select 1 from public.cardapio_exemplo_categorias where nome = 'Hambúrgueres Artesanais');

update public.cardapio_exemplo_categorias
set nome = 'Kebabs',
    descricao = 'Kebabs artesanais com massa fresca e recheios temperados.',
    ordem = 1,
    ativo = true,
    destaque = false
where nome = 'Hot Dogs';

insert into public.cardapio_exemplo_categorias (nome, descricao, ordem, ativo, destaque)
select 'Kebabs', 'Kebabs artesanais com massa fresca e recheios temperados.', 1, true, false
where not exists (select 1 from public.cardapio_exemplo_categorias where nome = 'Kebabs');

update public.cardapio_exemplo_categorias
set descricao = 'Porções crocantes para acompanhar.',
    ordem = 2,
    ativo = true,
    destaque = false
where nome = 'Porções';

insert into public.cardapio_exemplo_categorias (nome, descricao, ordem, ativo, destaque)
select 'Porções', 'Porções crocantes para acompanhar.', 2, true, false
where not exists (select 1 from public.cardapio_exemplo_categorias where nome = 'Porções');

update public.cardapio_exemplo_categorias
set descricao = 'Refrigerantes e sucos para acompanhar.',
    ordem = 3,
    ativo = true,
    destaque = false
where nome = 'Bebidas';

update public.cardapio_exemplo_categorias
set ativo = false
where nome = 'Sobremesas';

insert into public.cardapio_exemplo_produtos
  (id, categoria_id, nome, descricao, preco, preco_promocional, imagem_url, galeria, ingredientes, disponivel, destaque, tempo_preparo_min, ordem, ativo, min_adicionais, max_adicionais)
values
  (
    'd0000000-0000-4000-8000-000000000001',
    (select id from public.cardapio_exemplo_categorias where nome = 'Hambúrgueres Artesanais'),
    'Ligeirinho da Moto',
    'Hambúrguer artesanal de 150g, pão tostado na manteiga, cheddar fatiado, alface, tomate e creme de cheddar.',
    25.00, null,
    'https://tbckigurtfwpgnuhrapr.supabase.co/storage/v1/object/public/cardapio-exemplo-imagens/produtos/x-salada-1.jpg',
    array[]::text[],
    array['carne bovina 150g', 'pão tostado na manteiga', 'cheddar fatiado', 'alface', 'tomate', 'creme de cheddar']::text[],
    true, true, 25, 0, true, 0, 0
  ),
  (
    'd0000000-0000-4000-8000-000000000002',
    (select id from public.cardapio_exemplo_categorias where nome = 'Hambúrgueres Artesanais'),
    'Baconzinho Ping',
    'Hambúrguer artesanal de 150g, pão tostado na manteiga, cheddar fatiado, cebola caramelizada, bacon, alface, tomate e molho barbecue.',
    30.00, null,
    'https://tbckigurtfwpgnuhrapr.supabase.co/storage/v1/object/public/cardapio-exemplo-imagens/produtos/x-bacon-1.jpg',
    array[]::text[],
    array['carne bovina 150g', 'pão tostado na manteiga', 'cheddar fatiado', 'cebola caramelizada', 'bacon', 'alface', 'tomate', 'molho barbecue']::text[],
    true, true, 25, 1, true, 0, 0
  ),
  (
    'd0000000-0000-4000-8000-000000000003',
    (select id from public.cardapio_exemplo_categorias where nome = 'Hambúrgueres Artesanais'),
    'Costela Descarada',
    'Hambúrguer artesanal de costela de 150g, pão tostado na manteiga, cheddar fatiado, alface, tomate, picles, cebola caramelizada e molho barbecue.',
    32.00, null,
    'https://tbckigurtfwpgnuhrapr.supabase.co/storage/v1/object/public/cardapio-exemplo-imagens/produtos/x-tudo-1.jpg',
    array[]::text[],
    array['costela bovina 150g', 'pão tostado na manteiga', 'cheddar fatiado', 'alface', 'tomate', 'picles', 'cebola caramelizada', 'molho barbecue']::text[],
    true, false, 30, 2, true, 0, 0
  ),
  (
    'd0000000-0000-4000-8000-000000000004',
    (select id from public.cardapio_exemplo_categorias where nome = 'Hambúrgueres Artesanais'),
    'Frango de Quintal',
    'Hambúrguer artesanal de frango de 150g, pão tostado na manteiga, cheddar fatiado, alface, tomate e creme de cheddar.',
    23.00, null,
    'https://tbckigurtfwpgnuhrapr.supabase.co/storage/v1/object/public/cardapio-exemplo-imagens/produtos/smash-duplo-1.jpg',
    array[]::text[],
    array['frango 150g', 'pão tostado na manteiga', 'cheddar fatiado', 'alface', 'tomate', 'creme de cheddar']::text[],
    true, false, 25, 3, true, 0, 0
  ),
  (
    'd0000000-0000-4000-8000-000000000005',
    (select id from public.cardapio_exemplo_categorias where nome = 'Kebabs'),
    'Kebab Kafta',
    'Massa artesanal, kafta temperada, alface, tomate, cebola e molho barbecue.',
    24.90, null,
    'https://tbckigurtfwpgnuhrapr.supabase.co/storage/v1/object/public/cardapio-exemplo-imagens/produtos/kebab-kafta.jpg',
    array[]::text[],
    array['massa artesanal', 'kafta temperada', 'alface', 'tomate', 'cebola', 'molho barbecue']::text[],
    true, true, 20, 0, true, 0, 0
  ),
  (
    'd0000000-0000-4000-8000-000000000006',
    (select id from public.cardapio_exemplo_categorias where nome = 'Kebabs'),
    'Kebab Tavuk',
    'Massa artesanal, frango temperado, alface, tomate, cebola e creme de cheddar.',
    22.90, null,
    'https://tbckigurtfwpgnuhrapr.supabase.co/storage/v1/object/public/cardapio-exemplo-imagens/produtos/kebab-tavuk.jpg',
    array[]::text[],
    array['massa artesanal', 'frango temperado', 'alface', 'tomate', 'cebola', 'creme de cheddar']::text[],
    true, false, 20, 1, true, 0, 0
  ),
  (
    'd0000000-0000-4000-8000-000000000007',
    (select id from public.cardapio_exemplo_categorias where nome = 'Porções'),
    'Batata Frita',
    'Porção individual de batata frita crocante, 170g.',
    15.00, null,
    'https://tbckigurtfwpgnuhrapr.supabase.co/storage/v1/object/public/cardapio-exemplo-imagens/produtos/batata-frita-1.jpg',
    array[]::text[],
    array['batata', 'sal']::text[],
    true, false, 15, 0, true, 0, 0
  ),
  (
    'd0000000-0000-4000-8000-000000000008',
    (select id from public.cardapio_exemplo_categorias where nome = 'Bebidas'),
    'Refrigerante Lata',
    'Refrigerante gelado em lata.',
    8.00, null,
    'https://tbckigurtfwpgnuhrapr.supabase.co/storage/v1/object/public/cardapio-exemplo-imagens/produtos/refrigerante-1.jpg',
    array[]::text[],
    array['refrigerante']::text[],
    true, false, null, 0, true, 0, 0
  ),
  (
    'd0000000-0000-4000-8000-000000000009',
    (select id from public.cardapio_exemplo_categorias where nome = 'Bebidas'),
    'Suco de Laranja Natural',
    'Suco de laranja natural, 300ml.',
    8.00, null,
    'https://tbckigurtfwpgnuhrapr.supabase.co/storage/v1/object/public/cardapio-exemplo-imagens/produtos/suco-laranja-1.jpg',
    array[]::text[],
    array['laranja']::text[],
    true, false, null, 1, true, 0, 0
  );

insert into public.cardapio_exemplo_combos
  (id, nome, descricao, imagem_url, preco, disponivel, destaque, ordem, ativo)
values
  (
    'f0000000-0000-4000-8000-000000000001',
    'Combo Solteiro e Largado',
    '1 Ligeirinho da Moto + 170g de batata frita + 1 refrigerante lata ou 1 suco de laranja natural 300ml.',
    'https://tbckigurtfwpgnuhrapr.supabase.co/storage/v1/object/public/cardapio-exemplo-imagens/combos/combo-individual.jpg',
    40.00, true, true, 0, true
  ),
  (
    'f0000000-0000-4000-8000-000000000002',
    'Combo Casal Fofinho',
    'Escolha 2 principais: 2 kebabs, 2 Ligeirinhos ou 1 Ligeirinho + 1 kebab. Acompanha 170g de batata frita e 2 bebidas.',
    'https://tbckigurtfwpgnuhrapr.supabase.co/storage/v1/object/public/cardapio-exemplo-imagens/combos/combo-casal.jpg',
    75.00, true, true, 1, true
  ),
  (
    'f0000000-0000-4000-8000-000000000003',
    'Combo Enrolado',
    '1 Kebab Kafta + 170g de batata frita + 1 refrigerante lata ou 1 suco de laranja natural 300ml.',
    'https://tbckigurtfwpgnuhrapr.supabase.co/storage/v1/object/public/cardapio-exemplo-imagens/combos/combo-enrolado.jpg',
    35.00, true, false, 2, true
  ),
  (
    'f0000000-0000-4000-8000-000000000004',
    'Combo Frangolino',
    '1 Kebab Tavuk ou 1 Frango de Quintal + 170g de batata frita + 1 refrigerante lata ou 1 suco de laranja natural 300ml. Preço a definir pelo estabelecimento.',
    'https://tbckigurtfwpgnuhrapr.supabase.co/storage/v1/object/public/cardapio-exemplo-imagens/combos/combo-frangolino.jpg',
    0.00, false, false, 3, false
  );

insert into public.cardapio_exemplo_combo_itens (combo_id, produto_id, quantidade)
values
  ('f0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 1),
  ('f0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000007', 1),
  ('f0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000007', 1),
  ('f0000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000005', 1),
  ('f0000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000007', 1),
  ('f0000000-0000-4000-8000-000000000004', 'd0000000-0000-4000-8000-000000000007', 1);

insert into public.cardapio_exemplo_combo_grupos (id, combo_id, nome, min_qtd, max_qtd, obrigatorio, ordem)
values
  ('90000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000001', 'Escolha a bebida', 1, 1, true, 0),
  ('90000000-0000-4000-8000-000000000002', 'f0000000-0000-4000-8000-000000000002', 'Escolha 2 principais', 2, 2, true, 0),
  ('90000000-0000-4000-8000-000000000003', 'f0000000-0000-4000-8000-000000000002', 'Escolha as bebidas', 1, 1, true, 1),
  ('90000000-0000-4000-8000-000000000004', 'f0000000-0000-4000-8000-000000000003', 'Escolha a bebida', 1, 1, true, 0),
  ('90000000-0000-4000-8000-000000000005', 'f0000000-0000-4000-8000-000000000004', 'Escolha o principal', 1, 1, true, 0),
  ('90000000-0000-4000-8000-000000000006', 'f0000000-0000-4000-8000-000000000004', 'Escolha a bebida', 1, 1, true, 1);

insert into public.cardapio_exemplo_combo_opcoes (id, grupo_id, produto_id, quantidade, rotulo, ordem)
values
  ('91000000-0000-4000-8000-000000000001', '90000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000008', 1, 'Refrigerante lata', 0),
  ('91000000-0000-4000-8000-000000000002', '90000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000009', 1, 'Suco de laranja 300ml', 1),
  ('91000000-0000-4000-8000-000000000003', '90000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000005', 1, 'Kebab Kafta', 0),
  ('91000000-0000-4000-8000-000000000004', '90000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000006', 1, 'Kebab Tavuk', 1),
  ('91000000-0000-4000-8000-000000000005', '90000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000001', 1, 'Ligeirinho da Moto', 2),
  ('91000000-0000-4000-8000-000000000006', '90000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000008', 2, '2 refrigerantes lata', 0),
  ('91000000-0000-4000-8000-000000000007', '90000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000009', 2, '2 sucos de laranja 300ml', 1),
  ('91000000-0000-4000-8000-000000000008', '90000000-0000-4000-8000-000000000004', 'd0000000-0000-4000-8000-000000000008', 1, 'Refrigerante lata', 0),
  ('91000000-0000-4000-8000-000000000009', '90000000-0000-4000-8000-000000000004', 'd0000000-0000-4000-8000-000000000009', 1, 'Suco de laranja 300ml', 1),
  ('91000000-0000-4000-8000-000000000010', '90000000-0000-4000-8000-000000000005', 'd0000000-0000-4000-8000-000000000006', 1, 'Kebab Tavuk', 0),
  ('91000000-0000-4000-8000-000000000011', '90000000-0000-4000-8000-000000000005', 'd0000000-0000-4000-8000-000000000004', 1, 'Frango de Quintal', 1),
  ('91000000-0000-4000-8000-000000000012', '90000000-0000-4000-8000-000000000006', 'd0000000-0000-4000-8000-000000000008', 1, 'Refrigerante lata', 0),
  ('91000000-0000-4000-8000-000000000013', '90000000-0000-4000-8000-000000000006', 'd0000000-0000-4000-8000-000000000009', 1, 'Suco de laranja 300ml', 1);

update public.cardapio_exemplo_configuracoes
set descricao = 'Hamburgueria artesanal e kebaberia. Burgers, kebabs, batatas e bebidas.',
    mensagem_boas_vindas = 'Bem-vindo! Escolha seu burger, kebab ou combo e monte o pedido.'
where id = 1;

update public.cardapio_exemplo_banners
set subtitulo = 'Burgers artesanais, kebabs, batatas crocantes e bebidas geladas. Peça pelo cardápio digital.'
where id = 'b0000000-0000-4000-8000-000000000001';

notify pgrst, 'reload schema';

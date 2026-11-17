-- ATENÇÃO: ESTE ARQUIVO É O CONJUNTO ANTIGO DE DEMONSTRAÇÃO. NÃO EXECUTE SOBRE O CARDÁPIO REAL (use seed-cardapio-real.sql).
-- DADOS DE DEMONSTRAÇÃO DO BOM PA POXA
-- Cardápio demonstrativo de hamburgueria: produtos, preços e textos ilustrativos.
-- Remova com supabase/cleanup-demo.sql antes de cadastrar o cardápio real.
-- Imagens: bucket cardapio-exemplo-imagens, pastas produtos/, combos/ e banners/.
-- Fotografias reais com licenças livres para uso comercial; créditos no README.

update public.cardapio_exemplo_categorias
set nome = 'Burgers',
    descricao = 'Smash burgers artesanais, pães brioche e molhos da casa.',
    ordem = 0,
    ativo = true,
    destaque = true
where nome = 'Pratos';

update public.cardapio_exemplo_categorias
set descricao = 'Refrigerantes, sucos e milkshakes gelados.',
    ordem = 3,
    ativo = true,
    destaque = false
where nome = 'Bebidas';

update public.cardapio_exemplo_categorias
set descricao = 'Para fechar com doçura.',
    ordem = 4,
    ativo = true,
    destaque = false
where nome = 'Sobremesas';

insert into public.cardapio_exemplo_categorias (id, nome, descricao, ordem, ativo, destaque)
values
  ('c0000000-0000-4000-8000-000000000001', 'Hot Dogs', 'Hot dogs completos com ingredientes fresquinhos.', 1, true, false),
  ('c0000000-0000-4000-8000-000000000002', 'Porções', 'Batatas crocantes e frango empanado para dividir.', 2, true, false)
on conflict (id) do update set
  nome = excluded.nome,
  descricao = excluded.descricao,
  ordem = excluded.ordem,
  ativo = excluded.ativo,
  destaque = excluded.destaque;

insert into public.cardapio_exemplo_produtos
  (id, categoria_id, nome, descricao, preco, preco_promocional, imagem_url, galeria, ingredientes, disponivel, destaque, tempo_preparo_min, ordem, ativo, min_adicionais, max_adicionais)
values
  (
    'd0000000-0000-4000-8000-000000000001',
    (select id from public.cardapio_exemplo_categorias where nome = 'Burgers'),
    'Smash Duplo',
    'Dois smash burgers de 90 g, cheddar derretido, cebola caramelizada, picles e molho da casa no pão brioche.',
    34.90, 29.90,
    'https://tbckigurtfwpgnuhrapr.supabase.co/storage/v1/object/public/cardapio-exemplo-imagens/produtos/smash-duplo-1.jpg',
    array['https://tbckigurtfwpgnuhrapr.supabase.co/storage/v1/object/public/cardapio-exemplo-imagens/produtos/smash-duplo-2.jpg', 'https://tbckigurtfwpgnuhrapr.supabase.co/storage/v1/object/public/cardapio-exemplo-imagens/produtos/smash-duplo-3.jpg']::text[],
    array['carne bovina', 'cheddar', 'cebola caramelizada', 'picles', 'molho da casa', 'pão brioche']::text[],
    true, true, 25, 0, true, 0, 10
  ),
  (
    'd0000000-0000-4000-8000-000000000002',
    (select id from public.cardapio_exemplo_categorias where nome = 'Burgers'),
    'X-Salada',
    'Burger de 160 g, queijo prato, alface americana, tomate, cebola roxa e maionese da casa no pão brioche.',
    31.90, null,
    'https://tbckigurtfwpgnuhrapr.supabase.co/storage/v1/object/public/cardapio-exemplo-imagens/produtos/x-salada-1.jpg',
    array['https://tbckigurtfwpgnuhrapr.supabase.co/storage/v1/object/public/cardapio-exemplo-imagens/produtos/x-salada-2.jpg', 'https://tbckigurtfwpgnuhrapr.supabase.co/storage/v1/object/public/cardapio-exemplo-imagens/produtos/x-salada-3.jpg']::text[],
    array['carne bovina', 'queijo prato', 'alface', 'tomate', 'cebola roxa', 'maionese', 'pão brioche']::text[],
    true, false, 25, 1, true, 0, 10
  ),
  (
    'd0000000-0000-4000-8000-000000000003',
    (select id from public.cardapio_exemplo_categorias where nome = 'Burgers'),
    'X-Bacon',
    'Burger de 160 g, cheddar, bacon crocante, cebola crispy e molho barbecue no pão brioche.',
    36.90, null,
    'https://tbckigurtfwpgnuhrapr.supabase.co/storage/v1/object/public/cardapio-exemplo-imagens/produtos/x-bacon-1.jpg',
    array['https://tbckigurtfwpgnuhrapr.supabase.co/storage/v1/object/public/cardapio-exemplo-imagens/produtos/x-bacon-2.jpg', 'https://tbckigurtfwpgnuhrapr.supabase.co/storage/v1/object/public/cardapio-exemplo-imagens/produtos/x-bacon-3.jpg']::text[],
    array['carne bovina', 'cheddar', 'bacon', 'cebola crispy', 'molho barbecue', 'pão brioche']::text[],
    true, true, 25, 2, true, 0, 10
  ),
  (
    'd0000000-0000-4000-8000-000000000004',
    (select id from public.cardapio_exemplo_categorias where nome = 'Burgers'),
    'X-Tudo',
    'Burger de 180 g, cheddar, bacon, ovo, presunto, alface, tomate e maionese da casa no pão brioche.',
    42.90, null,
    'https://tbckigurtfwpgnuhrapr.supabase.co/storage/v1/object/public/cardapio-exemplo-imagens/produtos/x-tudo-1.jpg',
    array['https://tbckigurtfwpgnuhrapr.supabase.co/storage/v1/object/public/cardapio-exemplo-imagens/produtos/x-tudo-2.jpg', 'https://tbckigurtfwpgnuhrapr.supabase.co/storage/v1/object/public/cardapio-exemplo-imagens/produtos/x-tudo-3.jpg']::text[],
    array['carne bovina', 'cheddar', 'bacon', 'ovo', 'presunto', 'alface', 'tomate', 'maionese', 'pão brioche']::text[],
    true, false, 30, 3, true, 0, 10
  ),
  (
    'd0000000-0000-4000-8000-000000000005',
    (select id from public.cardapio_exemplo_categorias where nome = 'Hot Dogs'),
    'Hot Dog Completo',
    'Salsicha artesanal no pão macio, com molho de tomate, milho, batata palha e cebola crispy. Acompanha batata frita.',
    26.90, null,
    'https://tbckigurtfwpgnuhrapr.supabase.co/storage/v1/object/public/cardapio-exemplo-imagens/produtos/hotdog-completo-1.jpg',
    array['https://tbckigurtfwpgnuhrapr.supabase.co/storage/v1/object/public/cardapio-exemplo-imagens/produtos/hotdog-completo-2.jpg', 'https://tbckigurtfwpgnuhrapr.supabase.co/storage/v1/object/public/cardapio-exemplo-imagens/produtos/hotdog-completo-3.jpg']::text[],
    array['salsicha', 'pão de hot dog', 'molho de tomate', 'milho', 'batata palha', 'cebola crispy', 'batata frita']::text[],
    true, true, 20, 0, true, 0, 10
  ),
  (
    'd0000000-0000-4000-8000-000000000006',
    (select id from public.cardapio_exemplo_categorias where nome = 'Porções'),
    'Batata Frita',
    'Batata frita crocante com sal e páprica. Acompanha molho da casa.',
    18.90, null,
    'https://tbckigurtfwpgnuhrapr.supabase.co/storage/v1/object/public/cardapio-exemplo-imagens/produtos/batata-frita-1.jpg',
    array['https://tbckigurtfwpgnuhrapr.supabase.co/storage/v1/object/public/cardapio-exemplo-imagens/produtos/batata-frita-2.jpg', 'https://tbckigurtfwpgnuhrapr.supabase.co/storage/v1/object/public/cardapio-exemplo-imagens/produtos/batata-frita-3.jpg']::text[],
    array['batata', 'sal', 'páprica', 'molho da casa']::text[],
    true, false, 15, 0, true, 0, 10
  ),
  (
    'd0000000-0000-4000-8000-000000000007',
    (select id from public.cardapio_exemplo_categorias where nome = 'Porções'),
    'Batata Cheddar',
    'Batata frita coberta com cheddar cremoso e temperos da casa.',
    26.90, null,
    'https://tbckigurtfwpgnuhrapr.supabase.co/storage/v1/object/public/cardapio-exemplo-imagens/produtos/batata-cheddar-1.jpg',
    array['https://tbckigurtfwpgnuhrapr.supabase.co/storage/v1/object/public/cardapio-exemplo-imagens/produtos/batata-cheddar-2.jpg', 'https://tbckigurtfwpgnuhrapr.supabase.co/storage/v1/object/public/cardapio-exemplo-imagens/produtos/batata-cheddar-3.jpg']::text[],
    array['batata', 'cheddar', 'temperos da casa']::text[],
    true, true, 20, 1, true, 0, 10
  ),
  (
    'd0000000-0000-4000-8000-000000000008',
    (select id from public.cardapio_exemplo_categorias where nome = 'Porções'),
    'Frango Crocante',
    'Pedaços de frango empanados e crocantes, servidos com molho da casa.',
    29.90, null,
    'https://tbckigurtfwpgnuhrapr.supabase.co/storage/v1/object/public/cardapio-exemplo-imagens/produtos/frango-crocante-1.jpg',
    array['https://tbckigurtfwpgnuhrapr.supabase.co/storage/v1/object/public/cardapio-exemplo-imagens/produtos/frango-crocante-2.jpg', 'https://tbckigurtfwpgnuhrapr.supabase.co/storage/v1/object/public/cardapio-exemplo-imagens/produtos/frango-crocante-3.jpg']::text[],
    array['frango', 'farinha de trigo', 'temperos', 'molho da casa']::text[],
    true, false, 20, 2, true, 0, 10
  ),
  (
    'd0000000-0000-4000-8000-000000000009',
    (select id from public.cardapio_exemplo_categorias where nome = 'Bebidas'),
    'Refrigerante Lata',
    'Refrigerante gelado em lata. Escolha o sabor no atendimento.',
    6.90, null,
    'https://tbckigurtfwpgnuhrapr.supabase.co/storage/v1/object/public/cardapio-exemplo-imagens/produtos/refrigerante-1.jpg',
    array['https://tbckigurtfwpgnuhrapr.supabase.co/storage/v1/object/public/cardapio-exemplo-imagens/produtos/refrigerante-2.jpg', 'https://tbckigurtfwpgnuhrapr.supabase.co/storage/v1/object/public/cardapio-exemplo-imagens/produtos/refrigerante-3.jpg']::text[],
    array['refrigerante']::text[],
    true, false, null, 0, true, 0, 10
  ),
  (
    'd0000000-0000-4000-8000-000000000010',
    (select id from public.cardapio_exemplo_categorias where nome = 'Bebidas'),
    'Suco de Laranja',
    'Suco de laranja natural, feito na hora.',
    9.90, null,
    'https://tbckigurtfwpgnuhrapr.supabase.co/storage/v1/object/public/cardapio-exemplo-imagens/produtos/suco-laranja-1.jpg',
    array['https://tbckigurtfwpgnuhrapr.supabase.co/storage/v1/object/public/cardapio-exemplo-imagens/produtos/suco-laranja-2.jpg', 'https://tbckigurtfwpgnuhrapr.supabase.co/storage/v1/object/public/cardapio-exemplo-imagens/produtos/suco-laranja-3.jpg']::text[],
    array['laranja']::text[],
    true, false, null, 1, true, 0, 10
  ),
  (
    'd0000000-0000-4000-8000-000000000011',
    (select id from public.cardapio_exemplo_categorias where nome = 'Bebidas'),
    'Milkshake de Morango',
    'Milkshake cremoso de morango com chantilly e calda de morango.',
    17.90, null,
    'https://tbckigurtfwpgnuhrapr.supabase.co/storage/v1/object/public/cardapio-exemplo-imagens/produtos/milkshake-morango-1.jpg',
    array['https://tbckigurtfwpgnuhrapr.supabase.co/storage/v1/object/public/cardapio-exemplo-imagens/produtos/milkshake-morango-2.jpg', 'https://tbckigurtfwpgnuhrapr.supabase.co/storage/v1/object/public/cardapio-exemplo-imagens/produtos/milkshake-morango-3.jpg']::text[],
    array['leite', 'sorvete de morango', 'chantilly', 'calda de morango']::text[],
    true, true, null, 2, true, 0, 10
  ),
  (
    'd0000000-0000-4000-8000-000000000012',
    (select id from public.cardapio_exemplo_categorias where nome = 'Sobremesas'),
    'Brownie com Calda',
    'Brownie de chocolate meio amargo com calda quente de chocolate.',
    15.90, null,
    'https://tbckigurtfwpgnuhrapr.supabase.co/storage/v1/object/public/cardapio-exemplo-imagens/produtos/brownie-calda-1.jpg',
    array['https://tbckigurtfwpgnuhrapr.supabase.co/storage/v1/object/public/cardapio-exemplo-imagens/produtos/brownie-calda-2.jpg', 'https://tbckigurtfwpgnuhrapr.supabase.co/storage/v1/object/public/cardapio-exemplo-imagens/produtos/brownie-calda-3.jpg']::text[],
    array['chocolate', 'manteiga', 'ovos', 'farinha', 'açúcar', 'calda de chocolate']::text[],
    true, false, null, 0, true, 0, 10
  )
on conflict (id) do update set
  categoria_id = excluded.categoria_id,
  nome = excluded.nome,
  descricao = excluded.descricao,
  preco = excluded.preco,
  preco_promocional = excluded.preco_promocional,
  imagem_url = excluded.imagem_url,
  galeria = excluded.galeria,
  ingredientes = excluded.ingredientes,
  disponivel = excluded.disponivel,
  destaque = excluded.destaque,
  tempo_preparo_min = excluded.tempo_preparo_min,
  ordem = excluded.ordem,
  ativo = excluded.ativo,
  min_adicionais = excluded.min_adicionais,
  max_adicionais = excluded.max_adicionais;

insert into public.cardapio_exemplo_adicionais
  (id, produto_id, nome, descricao, preco, imagem_url, grupo, obrigatorio, min_qtd, max_qtd, disponivel, ordem)
values
  ('e0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'Bacon extra', 'Fatias extras de bacon crocante.', 4.00, null, 'Extras', false, 0, 3, true, 0),
  ('e0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000001', 'Cheddar extra', 'Mais cheddar derretido.', 3.50, null, 'Extras', false, 0, 3, true, 1),
  ('e0000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000001', 'Molho da casa', 'Molho especial para acompanhar.', 2.00, null, 'Molhos', false, 0, 2, true, 2),
  ('e0000000-0000-4000-8000-000000000004', 'd0000000-0000-4000-8000-000000000002', 'Ovo frito', 'Ovo frito com gema mole.', 2.50, null, 'Extras', false, 0, 2, true, 0),
  ('e0000000-0000-4000-8000-000000000005', 'd0000000-0000-4000-8000-000000000002', 'Bacon extra', 'Fatias extras de bacon crocante.', 4.00, null, 'Extras', false, 0, 3, true, 1),
  ('e0000000-0000-4000-8000-000000000006', 'd0000000-0000-4000-8000-000000000003', 'Cebola caramelizada', 'Cebola doce caramelizada.', 3.00, null, 'Extras', false, 0, 3, true, 0),
  ('e0000000-0000-4000-8000-000000000007', 'd0000000-0000-4000-8000-000000000003', 'Cheddar cremoso', 'Cheddar cremoso extra.', 4.50, null, 'Extras', false, 0, 3, true, 1),
  ('e0000000-0000-4000-8000-000000000008', 'd0000000-0000-4000-8000-000000000004', 'Carne extra', 'Um burger extra de 90 g.', 8.00, null, 'Extras', false, 0, 2, true, 0)
on conflict (id) do update set
  produto_id = excluded.produto_id,
  nome = excluded.nome,
  descricao = excluded.descricao,
  preco = excluded.preco,
  grupo = excluded.grupo,
  obrigatorio = excluded.obrigatorio,
  min_qtd = excluded.min_qtd,
  max_qtd = excluded.max_qtd,
  disponivel = excluded.disponivel,
  ordem = excluded.ordem;

insert into public.cardapio_exemplo_combos
  (id, nome, descricao, imagem_url, preco, disponivel, destaque, ordem, ativo)
values
  (
    'f0000000-0000-4000-8000-000000000001',
    'Combo Individual',
    'Smash Duplo + batata frita + refrigerante lata.',
    'https://tbckigurtfwpgnuhrapr.supabase.co/storage/v1/object/public/cardapio-exemplo-imagens/combos/combo-individual.jpg',
    44.90, true, true, 0, true
  ),
  (
    'f0000000-0000-4000-8000-000000000002',
    'Combo Casal',
    '2 Smash Duplo + 2 batatas fritas + 2 refrigerantes lata.',
    'https://tbckigurtfwpgnuhrapr.supabase.co/storage/v1/object/public/cardapio-exemplo-imagens/combos/combo-casal.jpg',
    79.90, true, true, 1, true
  )
on conflict (id) do update set
  nome = excluded.nome,
  descricao = excluded.descricao,
  imagem_url = excluded.imagem_url,
  preco = excluded.preco,
  disponivel = excluded.disponivel,
  destaque = excluded.destaque,
  ordem = excluded.ordem,
  ativo = excluded.ativo;

insert into public.cardapio_exemplo_combo_itens (id, combo_id, produto_id, quantidade)
values
  ('a0000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 1),
  ('a0000000-0000-4000-8000-000000000002', 'f0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000006', 1),
  ('a0000000-0000-4000-8000-000000000003', 'f0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000009', 1),
  ('a0000000-0000-4000-8000-000000000004', 'f0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000001', 2),
  ('a0000000-0000-4000-8000-000000000005', 'f0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000006', 2),
  ('a0000000-0000-4000-8000-000000000006', 'f0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000009', 2)
on conflict (id) do update set
  combo_id = excluded.combo_id,
  produto_id = excluded.produto_id,
  quantidade = excluded.quantidade;

insert into public.cardapio_exemplo_banners (id, titulo, subtitulo, imagem_url, link_url, ordem, ativo)
values (
  'b0000000-0000-4000-8000-000000000001',
  'Burgers artesanais do Bom Pa Poxa',
  'Smash burgers, bacon crocante, cheddar derretido e batatas fresquinhas. Monte seu pedido e receba em casa.',
  'https://tbckigurtfwpgnuhrapr.supabase.co/storage/v1/object/public/cardapio-exemplo-imagens/banners/banner-burgers.jpg',
  null, 0, true
)
on conflict (id) do update set
  titulo = excluded.titulo,
  subtitulo = excluded.subtitulo,
  imagem_url = excluded.imagem_url,
  link_url = excluded.link_url,
  ordem = excluded.ordem,
  ativo = excluded.ativo;

insert into public.cardapio_exemplo_cupons
  (codigo, tipo, valor, pedido_minimo, desconto_maximo, usos_maximos, usos, valido_de, valido_ate, ativo)
values ('DEMO10', 'percentual', 10, 30, null, 1000, 0, null, null, true)
on conflict (codigo) do update set
  tipo = excluded.tipo,
  valor = excluded.valor,
  pedido_minimo = excluded.pedido_minimo,
  desconto_maximo = excluded.desconto_maximo,
  usos_maximos = excluded.usos_maximos,
  ativo = excluded.ativo;

update public.cardapio_exemplo_configuracoes
set descricao = 'Hamburgueria artesanal com smash burgers, batatas crocantes e milkshakes. Peça pelo cardápio digital.',
    mensagem_boas_vindas = 'Bem-vindo! Escolha seu burger favorito e monte o pedido.',
    cor_primaria = '#E50914',
    cor_secundaria = '#141414',
    cor_destaque = '#D6A65C',
    cor_fundo = '#090909',
    cor_texto = '#FFFFFF',
    tipografia = 'bebas_figtree',
    status_abertura = 'aberto',
    aceitando_pedidos = true,
    taxa_entrega = 6.00,
    frete_gratis_acima_de = 80.00,
    pedido_minimo = 20.00,
    tempo_entrega_min = 45,
    tempo_retirada_min = 20,
    banner_url = 'https://tbckigurtfwpgnuhrapr.supabase.co/storage/v1/object/public/cardapio-exemplo-imagens/banners/banner-burgers.jpg',
    logo_url = null,
    endereco = null,
    bairro = null,
    cidade = null,
    estado = null,
    rodape = 'BOM PA POXA • Cardápio digital'
where id = 1;

insert into public.cardapio_exemplo_horarios (dia_semana, sequencia, fechado, abre, fecha)
select dia, 1, false, '11:00', '22:00'
from generate_series(0, 6) as dia
on conflict (dia_semana, sequencia) do update set
  fechado = false,
  abre = '11:00',
  fecha = '22:00';

notify pgrst, 'reload schema';

-- DADOS DE DEMONSTRAÇÃO DO BOM PA POXA
-- Produtos, preços, imagens e textos são ilustrativos.
-- Remova com supabase/cleanup-demo.sql antes de cadastrar o cardápio real.
-- Imagens: bucket cardapio-exemplo-imagens, pastas produtos/, combos/ e banners/.

delete from public.cardapio_exemplo_banners
where titulo = 'BOM PA POXA'
  and imagem_url is null
  and id <> 'b0000000-0000-4000-8000-000000000001';

insert into public.cardapio_exemplo_produtos
  (id, categoria_id, nome, descricao, preco, preco_promocional, imagem_url, galeria, ingredientes, disponivel, destaque, tempo_preparo_min, ordem, ativo, min_adicionais, max_adicionais)
values
  (
    'd0000000-0000-4000-8000-000000000001',
    (select id from public.cardapio_exemplo_categorias where nome = 'Pratos'),
    'Moqueca de peixe',
    'Peixe fresco com leite de coco, dendê, pimentões e coentro. Acompanha arroz e farofa.',
    59.90, 49.90,
    'https://tbckigurtfwpgnuhrapr.supabase.co/storage/v1/object/public/cardapio-exemplo-imagens/produtos/demo-01-moqueca.png',
    '{}'::text[],
    array['peixe', 'leite de coco', 'dendê', 'pimentão', 'coentro', 'arroz', 'farofa']::text[],
    true, true, 30, 0, true, 0, 10
  ),
  (
    'd0000000-0000-4000-8000-000000000002',
    (select id from public.cardapio_exemplo_categorias where nome = 'Pratos'),
    'Acarajé da casa',
    'Acarajé crocante com vatapá, caruru, camarão e pimenta baiana.',
    28.00, null,
    'https://tbckigurtfwpgnuhrapr.supabase.co/storage/v1/object/public/cardapio-exemplo-imagens/produtos/demo-02-acaraje.png',
    '{}'::text[],
    array['feijão-fradinho', 'vatapá', 'caruru', 'camarão', 'pimenta']::text[],
    true, true, 20, 1, true, 0, 10
  ),
  (
    'd0000000-0000-4000-8000-000000000003',
    (select id from public.cardapio_exemplo_categorias where nome = 'Pratos'),
    'Bobó de camarão',
    'Camarão com mandioca, leite de coco e temperos da casa.',
    54.90, null,
    'https://tbckigurtfwpgnuhrapr.supabase.co/storage/v1/object/public/cardapio-exemplo-imagens/produtos/demo-03-bobo.png',
    '{}'::text[],
    array['camarão', 'mandioca', 'leite de coco', 'coentro']::text[],
    true, false, 30, 2, true, 0, 10
  ),
  (
    'd0000000-0000-4000-8000-000000000004',
    (select id from public.cardapio_exemplo_categorias where nome = 'Pratos'),
    'Feijoada baiana',
    'Feijão preto com carnes selecionadas, arroz, couve e farofa.',
    46.00, null,
    'https://tbckigurtfwpgnuhrapr.supabase.co/storage/v1/object/public/cardapio-exemplo-imagens/produtos/demo-04-feijoada.png',
    '{}'::text[],
    array['feijão preto', 'carne seca', 'linguiça', 'arroz', 'couve', 'farofa']::text[],
    true, false, 40, 3, true, 0, 10
  ),
  (
    'd0000000-0000-4000-8000-000000000005',
    (select id from public.cardapio_exemplo_categorias where nome = 'Bebidas'),
    'Água de coco',
    'Natural, gelada e servida na hora.',
    8.00, null,
    'https://tbckigurtfwpgnuhrapr.supabase.co/storage/v1/object/public/cardapio-exemplo-imagens/produtos/demo-05-agua-coco.png',
    '{}'::text[],
    array['água de coco']::text[],
    true, false, null, 0, true, 0, 10
  ),
  (
    'd0000000-0000-4000-8000-000000000006',
    (select id from public.cardapio_exemplo_categorias where nome = 'Bebidas'),
    'Suco de laranja',
    'Laranja espremida na hora.',
    10.00, null,
    'https://tbckigurtfwpgnuhrapr.supabase.co/storage/v1/object/public/cardapio-exemplo-imagens/produtos/demo-06-suco-laranja.png',
    '{}'::text[],
    array['laranja']::text[],
    true, false, null, 1, true, 0, 10
  ),
  (
    'd0000000-0000-4000-8000-000000000007',
    (select id from public.cardapio_exemplo_categorias where nome = 'Bebidas'),
    'Caipirinha de limão',
    'Limão, cachaça e açúcar. Beba com moderação. Venda proibida para menores de 18 anos.',
    18.00, null,
    'https://tbckigurtfwpgnuhrapr.supabase.co/storage/v1/object/public/cardapio-exemplo-imagens/produtos/demo-07-caipirinha.png',
    '{}'::text[],
    array['limão', 'cachaça', 'açúcar']::text[],
    true, false, null, 2, true, 0, 10
  ),
  (
    'd0000000-0000-4000-8000-000000000008',
    (select id from public.cardapio_exemplo_categorias where nome = 'Sobremesas'),
    'Cocada baiana',
    'Coco, açúcar e um toque de cravo.',
    12.00, null,
    'https://tbckigurtfwpgnuhrapr.supabase.co/storage/v1/object/public/cardapio-exemplo-imagens/produtos/demo-08-cocada.png',
    '{}'::text[],
    array['coco', 'açúcar', 'cravo']::text[],
    true, false, null, 0, true, 0, 10
  ),
  (
    'd0000000-0000-4000-8000-000000000009',
    (select id from public.cardapio_exemplo_categorias where nome = 'Sobremesas'),
    'Quindim',
    'Gema, coco e açúcar, com casquinha dourada.',
    10.00, null,
    'https://tbckigurtfwpgnuhrapr.supabase.co/storage/v1/object/public/cardapio-exemplo-imagens/produtos/demo-09-quindim.png',
    '{}'::text[],
    array['gema', 'coco', 'açúcar']::text[],
    true, false, null, 1, true, 0, 10
  ),
  (
    'd0000000-0000-4000-8000-000000000010',
    (select id from public.cardapio_exemplo_categorias where nome = 'Sobremesas'),
    'Bolinho de estudante',
    'Doce, quentinho e polvilhado com canela.',
    12.00, null,
    'https://tbckigurtfwpgnuhrapr.supabase.co/storage/v1/object/public/cardapio-exemplo-imagens/produtos/demo-10-bolinho.png',
    '{}'::text[],
    array['farinha', 'leite', 'açúcar', 'canela']::text[],
    true, false, null, 2, true, 0, 10
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
  ('e0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'Farofa extra', 'Porção extra de farofa crocante.', 3.50, null, 'Extras', false, 0, 3, true, 0),
  ('e0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000001', 'Pimenta extra', 'Pimenta baiana à parte.', 0.00, null, 'Extras', false, 0, 3, true, 1),
  ('e0000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000001', 'Arroz extra', 'Porção extra de arroz branco.', 5.00, null, 'Extras', false, 0, 3, true, 2),
  ('e0000000-0000-4000-8000-000000000004', 'd0000000-0000-4000-8000-000000000002', 'Vatapá extra', 'Porção extra de vatapá.', 4.00, null, 'Extras', false, 0, 2, true, 0),
  ('e0000000-0000-4000-8000-000000000005', 'd0000000-0000-4000-8000-000000000002', 'Camarão extra', 'Camarões extras.', 8.00, null, 'Extras', false, 0, 2, true, 1),
  ('e0000000-0000-4000-8000-000000000006', 'd0000000-0000-4000-8000-000000000004', 'Farofa extra', 'Porção extra de farofa.', 3.50, null, 'Extras', false, 0, 3, true, 0)
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
    'Combo Moqueca + Água de coco',
    'Moqueca de peixe, água de coco e farofa extra.',
    'https://tbckigurtfwpgnuhrapr.supabase.co/storage/v1/object/public/cardapio-exemplo-imagens/combos/demo-combo-01.png',
    55.90, true, true, 0, true
  ),
  (
    'f0000000-0000-4000-8000-000000000002',
    'Combo Acarajé + Suco',
    'Acarajé da casa, suco de laranja e pimenta extra.',
    'https://tbckigurtfwpgnuhrapr.supabase.co/storage/v1/object/public/cardapio-exemplo-imagens/combos/demo-combo-02.png',
    34.90, true, true, 1, true
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
  ('a0000000-0000-4000-8000-000000000002', 'f0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000005', 1),
  ('a0000000-0000-4000-8000-000000000003', 'f0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000002', 1),
  ('a0000000-0000-4000-8000-000000000004', 'f0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000006', 1)
on conflict (id) do update set
  combo_id = excluded.combo_id,
  produto_id = excluded.produto_id,
  quantidade = excluded.quantidade;

insert into public.cardapio_exemplo_banners (id, titulo, subtitulo, imagem_url, link_url, ordem, ativo)
values (
  'b0000000-0000-4000-8000-000000000001',
  'DEMONSTRAÇÃO',
  'Produtos, preços e imagens ilustrativos. Substitua pelos dados reais do estabelecimento.',
  'https://tbckigurtfwpgnuhrapr.supabase.co/storage/v1/object/public/cardapio-exemplo-imagens/banners/demo-banner.png',
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
set descricao = 'Conteúdo de demonstração. Produtos, preços e imagens são ilustrativos e serão substituídos pelos dados reais.',
    mensagem_boas_vindas = 'Este cardápio está em modo de demonstração.',
    status_abertura = 'aberto',
    aceitando_pedidos = true,
    taxa_entrega = 6.00,
    frete_gratis_acima_de = 80.00,
    pedido_minimo = 20.00,
    tempo_entrega_min = 45,
    tempo_retirada_min = 20,
    banner_url = 'https://tbckigurtfwpgnuhrapr.supabase.co/storage/v1/object/public/cardapio-exemplo-imagens/banners/demo-banner.png',
    logo_url = null,
    endereco = null,
    bairro = null,
    cidade = null,
    estado = null
where id = 1;

insert into public.cardapio_exemplo_horarios (dia_semana, sequencia, fechado, abre, fecha)
select dia, 1, false, '11:00', '22:00'
from generate_series(0, 6) as dia
on conflict (dia_semana, sequencia) do update set
  fechado = false,
  abre = '11:00',
  fecha = '22:00';

notify pgrst, 'reload schema';


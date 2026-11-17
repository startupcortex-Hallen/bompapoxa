-- ATENÇÃO: NÃO EXECUTE COM O CARDÁPIO REAL ATIVO; ESTE SCRIPT REMOVE OS IDS d000.../f000....
-- REMOVE OS DADOS DE DEMONSTRAÇÃO DO BOM PA POXA
-- Execute no SQL Editor do Supabase ou pela Management API.
-- As imagens de demonstração ficam no bucket cardapio-exemplo-imagens;
-- remova manualmente os objetos das pastas produtos/, combos/ e banners/ pelo Storage ou pela API.

delete from public.cardapio_exemplo_combos
where id::text like 'f0000000-%';

delete from public.cardapio_exemplo_produtos
where id::text like 'd0000000-%';

delete from public.cardapio_exemplo_banners
where id::text like 'b0000000-%';

delete from public.cardapio_exemplo_cupons
where codigo = 'DEMO10';

update public.cardapio_exemplo_configuracoes
set descricao = 'Comida boa, feita com carinho.',
    mensagem_boas_vindas = 'Bem-vindo! Monte seu pedido e acompanhe tudo pelo celular.',
    status_abertura = 'automatico',
    aceitando_pedidos = true,
    taxa_entrega = 0,
    frete_gratis_acima_de = null,
    pedido_minimo = 0,
    tempo_entrega_min = 45,
    tempo_retirada_min = 20,
    banner_url = null,
    logo_url = null,
    endereco = null,
    bairro = null,
    cidade = null,
    estado = null
where id = 1;

update public.cardapio_exemplo_horarios
set fechado = true,
    abre = null,
    fecha = null
where sequencia = 1;

notify pgrst, 'reload schema';

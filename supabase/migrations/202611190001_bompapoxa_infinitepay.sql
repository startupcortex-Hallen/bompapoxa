-- BOM PA POXA — transição do provedor de pagamentos online para InfinitePay.
-- Idempotente: pode rodar em bancos com o schema antigo ou no schema já novo.
-- Remove as tentativas do provedor anterior e neutraliza os campos específicos.

-- ---------------------------------------------------------------------------
-- 1. Configuração pública
-- ---------------------------------------------------------------------------

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'cardapio_exemplo_pagamento_config'
      and column_name = 'mercadopago_ativo'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'cardapio_exemplo_pagamento_config'
      and column_name = 'infinitepay_ativo'
  ) then
    execute 'alter table public.cardapio_exemplo_pagamento_config rename column mercadopago_ativo to infinitepay_ativo';
    update public.cardapio_exemplo_pagamento_config
      set infinitepay_ativo = false,
          ultimo_teste_ok = false,
          ultimo_teste_em = null,
          ultimo_teste_ambiente = null,
          ultimo_teste_mensagem = 'Migração para InfinitePay; refaça o teste de comunicação.';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'cardapio_exemplo_pagamento_config'
      and column_name = 'infinitepay_ativo'
  ) then
    execute 'alter table public.cardapio_exemplo_pagamento_config add column infinitepay_ativo boolean not null default false';
  end if;
end;
$$;

alter table public.cardapio_exemplo_pagamento_config
  drop column if exists pix_online_ativo,
  drop column if exists cartao_online_ativo;

-- ---------------------------------------------------------------------------
-- 2. Pedido: origem do pagamento
-- ---------------------------------------------------------------------------

alter table public.cardapio_exemplo_pedidos
  drop constraint if exists cardapio_exemplo_pedidos_pagamento_provedor_check;
alter table public.cardapio_exemplo_pedidos
  drop constraint if exists cardapio_exemplo_pedidos_pagamento_online_tipo_check;

-- ---------------------------------------------------------------------------
-- 3. Pagamentos: remove o provedor anterior e renomeia os campos para o gateway
-- ---------------------------------------------------------------------------

alter table public.cardapio_exemplo_pagamentos
  drop constraint if exists cardapio_exemplo_pagamentos_provedor_check;
alter table public.cardapio_exemplo_pagamentos
  drop constraint if exists cardapio_exemplo_pagamentos_tipo_check;

delete from public.cardapio_exemplo_webhooks_processados
where provedor = 'mercadopago';

delete from public.cardapio_exemplo_pagamento_eventos
where pagamento_id in (
    select id from public.cardapio_exemplo_pagamentos where provedor = 'mercadopago'
  )
  or pedido_id in (
    select id from public.cardapio_exemplo_pedidos where pagamento_provedor = 'mercadopago'
  );

delete from public.cardapio_exemplo_pagamentos
where provedor = 'mercadopago';

update public.cardapio_exemplo_pedidos
set pagamento_provedor = 'manual',
    pagamento_online_tipo = null
where pagamento_provedor = 'mercadopago';

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'cardapio_exemplo_pagamentos'
      and column_name = 'status_mp'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'cardapio_exemplo_pagamentos'
      and column_name = 'status_gateway'
  ) then
    execute 'alter table public.cardapio_exemplo_pagamentos rename column status_mp to status_gateway';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'cardapio_exemplo_pagamentos'
      and column_name = 'mp_order_id'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'cardapio_exemplo_pagamentos'
      and column_name = 'gateway_order_id'
  ) then
    execute 'alter table public.cardapio_exemplo_pagamentos rename column mp_order_id to gateway_order_id';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'cardapio_exemplo_pagamentos'
      and column_name = 'mp_payment_id'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'cardapio_exemplo_pagamentos'
      and column_name = 'gateway_payment_id'
  ) then
    execute 'alter table public.cardapio_exemplo_pagamentos rename column mp_payment_id to gateway_payment_id';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'cardapio_exemplo_pagamentos'
      and column_name = 'mp_preference_id'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'cardapio_exemplo_pagamentos'
      and column_name = 'gateway_checkout_id'
  ) then
    execute 'alter table public.cardapio_exemplo_pagamentos rename column mp_preference_id to gateway_checkout_id';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'cardapio_exemplo_pagamentos'
      and column_name = 'mp_external_reference'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'cardapio_exemplo_pagamentos'
      and column_name = 'gateway_external_reference'
  ) then
    execute 'alter table public.cardapio_exemplo_pagamentos rename column mp_external_reference to gateway_external_reference';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'cardapio_exemplo_pagamentos'
      and column_name = 'init_point'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'cardapio_exemplo_pagamentos'
      and column_name = 'checkout_url'
  ) then
    execute 'alter table public.cardapio_exemplo_pagamentos rename column init_point to checkout_url';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'cardapio_exemplo_pagamentos'
      and column_name = 'checkout_url'
  ) then
    execute 'alter table public.cardapio_exemplo_pagamentos add column checkout_url text';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'cardapio_exemplo_pagamentos'
      and column_name = 'receipt_url'
  ) then
    execute 'alter table public.cardapio_exemplo_pagamentos add column receipt_url text';
  end if;
end;
$$;

alter table public.cardapio_exemplo_pagamentos
  drop column if exists sandbox_init_point,
  drop column if exists qr_code,
  drop column if exists qr_code_base64,
  drop column if exists ticket_url;

alter table public.cardapio_exemplo_pagamentos
  alter column provedor set default 'infinitepay',
  alter column tipo set default 'online';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'cardapio_exemplo_pagamentos_provedor_check'
      and conrelid = 'public.cardapio_exemplo_pagamentos'::regclass
  ) then
    alter table public.cardapio_exemplo_pagamentos
      add constraint cardapio_exemplo_pagamentos_provedor_check
      check (provedor = 'infinitepay');
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'cardapio_exemplo_pagamentos_tipo_check'
      and conrelid = 'public.cardapio_exemplo_pagamentos'::regclass
  ) then
    alter table public.cardapio_exemplo_pagamentos
      add constraint cardapio_exemplo_pagamentos_tipo_check
      check (tipo in ('online', 'pix', 'cartao'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'cardapio_exemplo_pedidos_pagamento_provedor_check'
      and conrelid = 'public.cardapio_exemplo_pedidos'::regclass
  ) then
    alter table public.cardapio_exemplo_pedidos
      add constraint cardapio_exemplo_pedidos_pagamento_provedor_check
      check (pagamento_provedor in ('manual', 'infinitepay'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'cardapio_exemplo_pedidos_pagamento_online_tipo_check'
      and conrelid = 'public.cardapio_exemplo_pedidos'::regclass
  ) then
    alter table public.cardapio_exemplo_pedidos
      add constraint cardapio_exemplo_pedidos_pagamento_online_tipo_check
      check (pagamento_online_tipo is null or pagamento_online_tipo in ('online', 'pix', 'cartao'));
  end if;
end;
$$;

drop index if exists public.cardapio_exemplo_pagamentos_mp_order_idx;
drop index if exists public.cardapio_exemplo_pagamentos_mp_payment_idx;
drop index if exists public.cardapio_exemplo_pagamentos_preference_idx;

create index if not exists cardapio_exemplo_pagamentos_gateway_order_idx
  on public.cardapio_exemplo_pagamentos (gateway_order_id);
create index if not exists cardapio_exemplo_pagamentos_gateway_payment_idx
  on public.cardapio_exemplo_pagamentos (gateway_payment_id);
create index if not exists cardapio_exemplo_pagamentos_gateway_checkout_idx
  on public.cardapio_exemplo_pagamentos (gateway_checkout_id);

-- ---------------------------------------------------------------------------
-- 4. Webhooks: verificação server-to-server no lugar da assinatura HMAC
-- ---------------------------------------------------------------------------

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'cardapio_exemplo_webhooks_processados'
      and column_name = 'assinatura_valida'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'cardapio_exemplo_webhooks_processados'
      and column_name = 'verificado'
  ) then
    execute 'alter table public.cardapio_exemplo_webhooks_processados rename column assinatura_valida to verificado';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'cardapio_exemplo_webhooks_processados'
      and column_name = 'verificado'
  ) then
    execute 'alter table public.cardapio_exemplo_webhooks_processados add column verificado boolean not null default false';
  end if;
end;
$$;

alter table public.cardapio_exemplo_webhooks_processados
  alter column provedor set default 'infinitepay';

-- ---------------------------------------------------------------------------
-- 5. Snapshot de impressão com campos neutros do gateway
-- ---------------------------------------------------------------------------

create or replace function public.cardapio_exemplo_payload_impressao(p_pedido_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'pedido_id', p.id,
    'numero', p.numero,
    'criado_em', p.created_at,
    'status', p.status,
    'cliente_nome', p.cliente_nome,
    'cliente_telefone', p.cliente_telefone,
    'cliente_email', p.cliente_email,
    'modalidade', p.modalidade,
    'endereco', jsonb_strip_nulls(jsonb_build_object(
      'cep', p.cep,
      'endereco', p.endereco,
      'numero', p.numero_endereco,
      'complemento', p.complemento,
      'bairro', p.bairro,
      'cidade', p.cidade,
      'referencia', p.referencia
    )),
    'itens', coalesce((
      select jsonb_agg(jsonb_build_object(
        'nome', i.nome,
        'quantidade', i.quantidade,
        'preco_unitario', i.preco_unitario,
        'adicionais', i.adicionais,
        'observacao', i.observacao
      ) order by i.created_at)
      from public.cardapio_exemplo_itens_pedido i
      where i.pedido_id = p.id
    ), '[]'::jsonb),
    'observacoes', p.observacoes,
    'forma_pagamento', p.forma_pagamento,
    'pagamento_provedor', p.pagamento_provedor,
    'pagamento_online_tipo', p.pagamento_online_tipo,
    'pagamento_status', p.status_pagamento,
    'pagamento_online', (
      select jsonb_build_object(
        'provedor', pg.provedor,
        'status', pg.status,
        'status_gateway', pg.status_gateway,
        'tipo', pg.tipo,
        'metodo', pg.metodo,
        'gateway_order_id', pg.gateway_order_id,
        'gateway_payment_id', pg.gateway_payment_id,
        'gateway_checkout_id', pg.gateway_checkout_id,
        'receipt_url', pg.receipt_url
      )
      from public.cardapio_exemplo_pagamentos pg
      where pg.pedido_id = p.id
      limit 1
    ),
    'troco_para', p.troco_para,
    'subtotal', p.subtotal,
    'taxa_entrega', p.taxa_entrega,
    'desconto', p.desconto,
    'total', p.total,
    'cupom_codigo', p.cupom_codigo,
    'estabelecimento', jsonb_build_object(
      'nome', c.nome_estabelecimento,
      'endereco', c.endereco,
      'bairro', c.bairro,
      'cidade', c.cidade,
      'telefone', c.telefone,
      'whatsapp', c.whatsapp
    )
  )
  from public.cardapio_exemplo_pedidos p
  cross join public.cardapio_exemplo_configuracoes c
  where p.id = p_pedido_id and c.id = 1;
$$;

revoke all on function public.cardapio_exemplo_payload_impressao(uuid) from public, anon, authenticated;
grant execute on function public.cardapio_exemplo_payload_impressao(uuid) to service_role;

update public.cardapio_exemplo_fila_impressao f
set payload = public.cardapio_exemplo_payload_impressao(f.pedido_id)
where f.status = 'pendente'
  and f.reimpressao = false
  and f.pedido_id is not null
  and public.cardapio_exemplo_payload_impressao(f.pedido_id) is not null;

-- ---------------------------------------------------------------------------
-- 6. Configuração pública
-- ---------------------------------------------------------------------------

create or replace function public.cardapio_exemplo_pagamento_publico()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'infinitepay_ativo', c.infinitepay_ativo,
    'online_ativo', c.infinitepay_ativo
  )
  from public.cardapio_exemplo_pagamento_config c
  where c.id = 1;
$$;

revoke all on function public.cardapio_exemplo_pagamento_publico() from public;
grant execute on function public.cardapio_exemplo_pagamento_publico() to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 7. Acompanhamento do pedido com pagamento online
-- ---------------------------------------------------------------------------

create or replace function public.cardapio_exemplo_get_pedido(p_pedido_id uuid, p_token uuid)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'id', o.id,
    'numero', o.numero,
    'status', o.status,
    'status_pagamento', o.status_pagamento,
    'pagamento_provedor', o.pagamento_provedor,
    'pagamento_online_tipo', o.pagamento_online_tipo,
    'cliente_nome', o.cliente_nome,
    'cliente_telefone', o.cliente_telefone,
    'modalidade', o.modalidade,
    'endereco', jsonb_strip_nulls(jsonb_build_object(
      'cep', o.cep, 'endereco', o.endereco, 'numero', o.numero_endereco,
      'complemento', o.complemento, 'bairro', o.bairro, 'cidade', o.cidade, 'referencia', o.referencia,
      'latitude', o.latitude, 'longitude', o.longitude
    )),
    'forma_pagamento', o.forma_pagamento,
    'troco_para', o.troco_para,
    'subtotal', o.subtotal,
    'taxa_entrega', o.taxa_entrega,
    'desconto', o.desconto,
    'total', o.total,
    'cupom_codigo', o.cupom_codigo,
    'observacoes', o.observacoes,
    'criado_em', o.created_at,
    'atualizado_em', o.updated_at,
    'itens', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', i.id, 'nome', i.nome, 'preco_unitario', i.preco_unitario,
        'quantidade', i.quantidade, 'adicionais', i.adicionais, 'observacao', i.observacao
      ) order by i.created_at)
      from public.cardapio_exemplo_itens_pedido i where i.pedido_id = o.id
    ), '[]'::jsonb),
    'historico', coalesce((
      select jsonb_agg(jsonb_build_object(
        'status_anterior', h.status_anterior, 'status_novo', h.status_novo, 'created_at', h.created_at
      ) order by h.created_at)
      from public.cardapio_exemplo_historico_pedidos h where h.pedido_id = o.id
    ), '[]'::jsonb),
    'avaliacao', (
      select jsonb_build_object('nota', a.nota, 'comentario', a.comentario, 'aprovado', a.aprovado)
      from public.cardapio_exemplo_avaliacoes a where a.pedido_id = o.id
    ),
    'pagamento', (
      select jsonb_build_object(
        'id', pg.id,
        'provedor', pg.provedor,
        'tipo', pg.tipo,
        'status', pg.status,
        'status_gateway', pg.status_gateway,
        'metodo', pg.metodo,
        'valor', pg.valor,
        'gateway_order_id', pg.gateway_order_id,
        'gateway_payment_id', pg.gateway_payment_id,
        'gateway_checkout_id', pg.gateway_checkout_id,
        'checkout_url', pg.checkout_url,
        'receipt_url', pg.receipt_url,
        'erro', pg.ultimo_erro,
        'atualizado_em', pg.updated_at
      )
      from public.cardapio_exemplo_pagamentos pg where pg.pedido_id = o.id limit 1
    )
  )
  from public.cardapio_exemplo_pedidos o
  where o.id = p_pedido_id and o.tracking_token = p_token;
$$;

revoke all on function public.cardapio_exemplo_get_pedido(uuid, uuid) from public;
grant execute on function public.cardapio_exemplo_get_pedido(uuid, uuid) to anon, authenticated, service_role;

notify pgrst, 'reload schema';

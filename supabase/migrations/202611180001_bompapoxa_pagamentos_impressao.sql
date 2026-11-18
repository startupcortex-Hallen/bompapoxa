-- BOM PA POXA — pagamentos online Mercado Pago + fila de impressão ESC/POS.
-- Migração não destrutiva. Todos os objetos usam o prefixo cardapio_exemplo_.

-- ---------------------------------------------------------------------------
-- 1. Pedido: origem do pagamento (manual x Mercado Pago)
-- ---------------------------------------------------------------------------

alter table public.cardapio_exemplo_pedidos
  add column if not exists pagamento_provedor text not null default 'manual';

alter table public.cardapio_exemplo_pedidos
  add column if not exists pagamento_online_tipo text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'cardapio_exemplo_pedidos_pagamento_provedor_check'
      and conrelid = 'public.cardapio_exemplo_pedidos'::regclass
  ) then
    alter table public.cardapio_exemplo_pedidos
      add constraint cardapio_exemplo_pedidos_pagamento_provedor_check
      check (pagamento_provedor in ('manual', 'mercadopago'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'cardapio_exemplo_pedidos_pagamento_online_tipo_check'
      and conrelid = 'public.cardapio_exemplo_pedidos'::regclass
  ) then
    alter table public.cardapio_exemplo_pedidos
      add constraint cardapio_exemplo_pedidos_pagamento_online_tipo_check
      check (pagamento_online_tipo is null or pagamento_online_tipo in ('pix', 'cartao'));
  end if;
end;
$$;

create index if not exists cardapio_exemplo_pedidos_pagamento_provedor_idx
  on public.cardapio_exemplo_pedidos (pagamento_provedor, created_at desc);

-- ---------------------------------------------------------------------------
-- 2. Configuração pública do gateway (sem segredos)
-- ---------------------------------------------------------------------------

create table if not exists public.cardapio_exemplo_pagamento_config (
  id smallint primary key default 1 check (id = 1),
  mercadopago_ativo boolean not null default false,
  pix_online_ativo boolean not null default true,
  cartao_online_ativo boolean not null default true,
  ultimo_teste_ok boolean not null default false,
  ultimo_teste_em timestamptz,
  ultimo_teste_ambiente text,
  ultimo_teste_mensagem text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.cardapio_exemplo_pagamento_config (id)
values (1)
on conflict (id) do nothing;

drop trigger if exists cardapio_exemplo_tg_pagamento_config_updated on public.cardapio_exemplo_pagamento_config;
create trigger cardapio_exemplo_tg_pagamento_config_updated
  before update on public.cardapio_exemplo_pagamento_config
  for each row execute function public.cardapio_exemplo_set_updated_at();

-- ---------------------------------------------------------------------------
-- 3. Pagamentos online
-- ---------------------------------------------------------------------------

create table if not exists public.cardapio_exemplo_pagamentos (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null unique references public.cardapio_exemplo_pedidos(id) on delete cascade,
  provedor text not null default 'mercadopago' check (provedor = 'mercadopago'),
  ambiente text not null check (ambiente in ('sandbox', 'producao')),
  tipo text not null check (tipo in ('pix', 'cartao')),
  status text not null default 'pendente'
    check (status in ('pendente', 'em_processamento', 'aprovado', 'recusado', 'cancelado', 'expirado', 'estornado', 'erro')),
  status_mp text,
  metodo text,
  valor numeric(10,2) not null check (valor >= 0),
  moeda text not null default 'BRL' check (char_length(moeda) = 3),
  mp_order_id text,
  mp_payment_id text,
  mp_preference_id text,
  mp_external_reference text not null,
  idempotency_key text not null unique,
  qr_code text,
  qr_code_base64 text,
  ticket_url text,
  init_point text,
  sandbox_init_point text,
  ultimo_erro text,
  aprovado_em timestamptz,
  expirado_em timestamptz,
  sincronizado_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cardapio_exemplo_pagamentos_status_idx
  on public.cardapio_exemplo_pagamentos (status, created_at desc);
create index if not exists cardapio_exemplo_pagamentos_mp_order_idx
  on public.cardapio_exemplo_pagamentos (mp_order_id);
create index if not exists cardapio_exemplo_pagamentos_mp_payment_idx
  on public.cardapio_exemplo_pagamentos (mp_payment_id);
create index if not exists cardapio_exemplo_pagamentos_preference_idx
  on public.cardapio_exemplo_pagamentos (mp_preference_id);

drop trigger if exists cardapio_exemplo_tg_pagamentos_updated on public.cardapio_exemplo_pagamentos;
create trigger cardapio_exemplo_tg_pagamentos_updated
  before update on public.cardapio_exemplo_pagamentos
  for each row execute function public.cardapio_exemplo_set_updated_at();

create table if not exists public.cardapio_exemplo_pagamento_eventos (
  id uuid primary key default gen_random_uuid(),
  pagamento_id uuid references public.cardapio_exemplo_pagamentos(id) on delete cascade,
  pedido_id uuid references public.cardapio_exemplo_pedidos(id) on delete cascade,
  origem text not null check (origem in ('criacao', 'webhook', 'sincronizacao', 'admin', 'teste')),
  evento text not null,
  status_anterior text,
  status_novo text,
  detalhe jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists cardapio_exemplo_pagamento_eventos_pedido_idx
  on public.cardapio_exemplo_pagamento_eventos (pedido_id, created_at desc);

create table if not exists public.cardapio_exemplo_webhooks_processados (
  id uuid primary key default gen_random_uuid(),
  provedor text not null default 'mercadopago',
  topico text not null,
  recurso_id text,
  acao text,
  evento_key text not null unique,
  request_id text,
  assinatura_valida boolean not null default false,
  status text not null default 'recebido'
    check (status in ('recebido', 'processando', 'processado', 'ignorado', 'erro')),
  tentativas integer not null default 1 check (tentativas >= 1),
  erro text,
  payload_resumo jsonb not null default '{}'::jsonb,
  recebido_em timestamptz not null default now(),
  processado_em timestamptz
);

create index if not exists cardapio_exemplo_webhooks_status_idx
  on public.cardapio_exemplo_webhooks_processados (status, recebido_em desc);

-- ---------------------------------------------------------------------------
-- 4. Impressoras e fila de impressão
-- ---------------------------------------------------------------------------

create table if not exists public.cardapio_exemplo_impressoras (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (char_length(trim(nome)) between 1 and 120),
  setor text not null default 'principal' check (char_length(trim(setor)) between 1 and 40),
  largura_mm smallint not null default 80 check (largura_mm in (58, 80)),
  ativo boolean not null default true,
  token_hash text not null unique,
  ultimo_ping_em timestamptz,
  ultimo_info jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists cardapio_exemplo_tg_impressoras_updated on public.cardapio_exemplo_impressoras;
create trigger cardapio_exemplo_tg_impressoras_updated
  before update on public.cardapio_exemplo_impressoras
  for each row execute function public.cardapio_exemplo_set_updated_at();

create table if not exists public.cardapio_exemplo_fila_impressao (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid references public.cardapio_exemplo_pedidos(id) on delete set null,
  impressora_id uuid references public.cardapio_exemplo_impressoras(id) on delete set null,
  tipo text not null default 'pedido' check (tipo in ('pedido', 'teste')),
  setor text not null default 'principal' check (char_length(trim(setor)) between 1 and 40),
  job_key text not null unique,
  status text not null default 'pendente'
    check (status in ('pendente', 'processando', 'impresso', 'erro', 'cancelado')),
  largura_mm smallint check (largura_mm is null or largura_mm in (58, 80)),
  payload jsonb not null default '{}'::jsonb,
  tentativas integer not null default 0 check (tentativas >= 0),
  erro text,
  reimpressao boolean not null default false,
  solicitado_por uuid,
  created_at timestamptz not null default now(),
  processing_at timestamptz,
  completed_at timestamptz
);

create index if not exists cardapio_exemplo_fila_impressao_status_idx
  on public.cardapio_exemplo_fila_impressao (status, created_at);
create index if not exists cardapio_exemplo_fila_impressao_pedido_idx
  on public.cardapio_exemplo_fila_impressao (pedido_id, created_at desc);
create index if not exists cardapio_exemplo_fila_impressao_impressora_idx
  on public.cardapio_exemplo_fila_impressao (impressora_id, status);

-- ---------------------------------------------------------------------------
-- 5. Snapshot do pedido para impressão
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
        'status', pg.status,
        'status_mp', pg.status_mp,
        'tipo', pg.tipo,
        'metodo', pg.metodo,
        'mp_order_id', pg.mp_order_id,
        'mp_payment_id', pg.mp_payment_id,
        'ticket_url', pg.ticket_url
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

create or replace function public.cardapio_exemplo_enfileirar_impressao_pedido()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.cardapio_exemplo_fila_impressao
    (pedido_id, tipo, setor, job_key, status, payload, largura_mm)
  values
    (new.id, 'pedido', 'principal', 'pedido:' || new.id::text || ':principal', 'pendente',
     public.cardapio_exemplo_payload_impressao(new.id), null)
  on conflict (job_key) do nothing;
  return new;
exception
  when others then
    raise warning 'Falha ao enfileirar impressão do pedido %: %', new.id, sqlerrm;
    return new;
end;
$$;

drop trigger if exists cardapio_exemplo_tg_pedidos_fila_impressao on public.cardapio_exemplo_pedidos;
create trigger cardapio_exemplo_tg_pedidos_fila_impressao
  after insert on public.cardapio_exemplo_pedidos
  for each row execute function public.cardapio_exemplo_enfileirar_impressao_pedido();

-- O pedido é criado antes dos itens e dos valores finais. Atualiza o snapshot
-- enquanto o trabalho ainda está pendente para incluir itens, adicionais e totais.
create or replace function public.cardapio_exemplo_atualizar_fila_apos_pedido()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.cardapio_exemplo_fila_impressao
  set payload = public.cardapio_exemplo_payload_impressao(new.id)
  where pedido_id = new.id
    and status = 'pendente'
    and reimpressao = false;
  return new;
end;
$$;

drop trigger if exists cardapio_exemplo_tg_pedidos_fila_atualizar on public.cardapio_exemplo_pedidos;
create trigger cardapio_exemplo_tg_pedidos_fila_atualizar
  after update on public.cardapio_exemplo_pedidos
  for each row execute function public.cardapio_exemplo_atualizar_fila_apos_pedido();

create or replace function public.cardapio_exemplo_atualizar_payload_fila_pedido(p_pedido_id uuid)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  update public.cardapio_exemplo_fila_impressao
  set payload = public.cardapio_exemplo_payload_impressao(p_pedido_id)
  where pedido_id = p_pedido_id
    and status in ('pendente', 'erro')
    and reimpressao = false;
$$;

revoke all on function public.cardapio_exemplo_atualizar_payload_fila_pedido(uuid) from public, anon, authenticated;
grant execute on function public.cardapio_exemplo_atualizar_payload_fila_pedido(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- 6. RPCs públicas de pagamento
-- ---------------------------------------------------------------------------

create or replace function public.cardapio_exemplo_pagamento_publico()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'mercadopago_ativo', c.mercadopago_ativo,
    'pix_online', c.mercadopago_ativo and c.pix_online_ativo,
    'cartao_online', c.mercadopago_ativo and c.cartao_online_ativo
  )
  from public.cardapio_exemplo_pagamento_config c
  where c.id = 1;
$$;

revoke all on function public.cardapio_exemplo_pagamento_publico() from public;
grant execute on function public.cardapio_exemplo_pagamento_publico() to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 7. get_pedido com pagamento online
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
        'tipo', pg.tipo,
        'status', pg.status,
        'status_mp', pg.status_mp,
        'metodo', pg.metodo,
        'valor', pg.valor,
        'qr_code', pg.qr_code,
        'qr_code_base64', pg.qr_code_base64,
        'ticket_url', pg.ticket_url,
        'init_point', pg.init_point,
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

-- ---------------------------------------------------------------------------
-- 8. RPCs administrativas de impressão
-- ---------------------------------------------------------------------------

create or replace function public.cardapio_exemplo_criar_impressora(
  p_nome text,
  p_largura_mm integer default 80,
  p_setor text default 'principal'
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
  v_token text;
begin
  if not public.cardapio_exemplo_e_admin() then
    raise exception 'Acesso negado.' using errcode = '42501';
  end if;
  if p_nome is null or char_length(trim(p_nome)) < 1 then
    raise exception 'Informe o nome da impressora.';
  end if;
  if p_largura_mm not in (58, 80) then
    raise exception 'A largura deve ser 58 ou 80 mm.';
  end if;

  v_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  insert into public.cardapio_exemplo_impressoras (nome, setor, largura_mm, token_hash)
  values (trim(p_nome), coalesce(nullif(trim(p_setor), ''), 'principal'), p_largura_mm, md5(v_token))
  returning id into v_id;

  return jsonb_build_object(
    'id', v_id,
    'nome', trim(p_nome),
    'setor', coalesce(nullif(trim(p_setor), ''), 'principal'),
    'largura_mm', p_largura_mm,
    'token', v_token
  );
end;
$$;

revoke all on function public.cardapio_exemplo_criar_impressora(text, integer, text) from public, anon;
grant execute on function public.cardapio_exemplo_criar_impressora(text, integer, text) to authenticated, service_role;

create or replace function public.cardapio_exemplo_regenerar_token_impressora(p_id uuid)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_token text;
begin
  if not public.cardapio_exemplo_e_admin() then
    raise exception 'Acesso negado.' using errcode = '42501';
  end if;
  v_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  update public.cardapio_exemplo_impressoras
  set token_hash = md5(v_token), ultimo_ping_em = null, ultimo_info = '{}'::jsonb
  where id = p_id;
  if not found then raise exception 'Impressora não encontrada.'; end if;
  return v_token;
end;
$$;

revoke all on function public.cardapio_exemplo_regenerar_token_impressora(uuid) from public, anon;
grant execute on function public.cardapio_exemplo_regenerar_token_impressora(uuid) to authenticated, service_role;

create or replace function public.cardapio_exemplo_agente_ping(p_token text, p_info jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_impressora public.cardapio_exemplo_impressoras%rowtype;
begin
  select * into v_impressora
  from public.cardapio_exemplo_impressoras
  where token_hash = md5(coalesce(p_token, '')) and ativo
  limit 1;
  if not found then
    raise exception 'Token de impressora inválido.' using errcode = '28000';
  end if;

  update public.cardapio_exemplo_impressoras
  set ultimo_ping_em = now(),
      ultimo_info = coalesce(p_info, '{}'::jsonb)
  where id = v_impressora.id;

  return jsonb_build_object(
    'ok', true,
    'impressora_id', v_impressora.id,
    'nome', v_impressora.nome,
    'setor', v_impressora.setor,
    'largura_mm', v_impressora.largura_mm,
    'servidor_em', now()
  );
end;
$$;

revoke all on function public.cardapio_exemplo_agente_ping(text, jsonb) from public;
grant execute on function public.cardapio_exemplo_agente_ping(text, jsonb) to anon, authenticated, service_role;

create or replace function public.cardapio_exemplo_agente_claim_jobs(p_token text, p_limit integer default 5)
returns table (
  id uuid,
  job_key text,
  pedido_id uuid,
  tipo text,
  setor text,
  payload jsonb,
  largura_mm smallint,
  tentativas integer,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_impressora public.cardapio_exemplo_impressoras%rowtype;
  v_limite integer;
begin
  select * into v_impressora
  from public.cardapio_exemplo_impressoras
  where token_hash = md5(coalesce(p_token, '')) and ativo
  limit 1;
  if not found then
    raise exception 'Token de impressora inválido.' using errcode = '28000';
  end if;

  v_limite := greatest(1, least(coalesce(p_limit, 5), 20));

  update public.cardapio_exemplo_impressoras i
  set ultimo_ping_em = now()
  where i.id = v_impressora.id;

  return query
  with candidatos as (
    select f.id
    from public.cardapio_exemplo_fila_impressao f
    where (f.impressora_id is null or f.impressora_id = v_impressora.id)
      and (
        f.status = 'pendente'
        or (f.status = 'processando' and f.processing_at < now() - interval '3 minutes')
      )
    order by f.created_at
    limit v_limite
    for update skip locked
  ),
  atualizados as (
    update public.cardapio_exemplo_fila_impressao f
    set status = 'processando',
        processing_at = now(),
        impressora_id = v_impressora.id,
        tentativas = f.tentativas + 1
    from candidatos c
    where f.id = c.id
    returning f.id, f.job_key, f.pedido_id, f.tipo, f.setor, f.payload,
      coalesce(f.largura_mm, v_impressora.largura_mm) as largura_mm,
      f.tentativas, f.created_at
  )
  select a.id, a.job_key, a.pedido_id, a.tipo, a.setor, a.payload,
    a.largura_mm, a.tentativas, a.created_at
  from atualizados a
  order by a.created_at;
end;
$$;

revoke all on function public.cardapio_exemplo_agente_claim_jobs(text, integer) from public;
grant execute on function public.cardapio_exemplo_agente_claim_jobs(text, integer) to anon, authenticated, service_role;

create or replace function public.cardapio_exemplo_agente_concluir(
  p_token text,
  p_job_id uuid,
  p_sucesso boolean,
  p_erro text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_impressora_id uuid;
begin
  select id into v_impressora_id
  from public.cardapio_exemplo_impressoras
  where token_hash = md5(coalesce(p_token, '')) and ativo
  limit 1;
  if v_impressora_id is null then
    raise exception 'Token de impressora inválido.' using errcode = '28000';
  end if;

  update public.cardapio_exemplo_fila_impressao
  set status = case when p_sucesso then 'impresso' else 'erro' end,
      completed_at = now(),
      erro = case when p_sucesso then null else left(coalesce(p_erro, 'Falha na impressão.'), 1000) end
  where id = p_job_id
    and status = 'processando'
    and (impressora_id = v_impressora_id or impressora_id is null);

  if not found then
    raise exception 'Trabalho de impressão não encontrado ou já concluído.';
  end if;

  update public.cardapio_exemplo_impressoras
  set ultimo_ping_em = now()
  where id = v_impressora_id;
end;
$$;

revoke all on function public.cardapio_exemplo_agente_concluir(text, uuid, boolean, text) from public;
grant execute on function public.cardapio_exemplo_agente_concluir(text, uuid, boolean, text) to anon, authenticated, service_role;

create or replace function public.cardapio_exemplo_reprocessar_impressao(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.cardapio_exemplo_e_admin() then
    raise exception 'Acesso negado.' using errcode = '42501';
  end if;
  update public.cardapio_exemplo_fila_impressao
  set status = 'pendente', erro = null, processing_at = null, completed_at = null, impressora_id = null
  where id = p_id and status in ('erro', 'cancelado');
  if not found then raise exception 'Somente trabalhos com erro ou cancelados podem ser reprocessados.'; end if;
end;
$$;

revoke all on function public.cardapio_exemplo_reprocessar_impressao(uuid) from public, anon;
grant execute on function public.cardapio_exemplo_reprocessar_impressao(uuid) to authenticated, service_role;

create or replace function public.cardapio_exemplo_cancelar_impressao(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.cardapio_exemplo_e_admin() then
    raise exception 'Acesso negado.' using errcode = '42501';
  end if;
  update public.cardapio_exemplo_fila_impressao
  set status = 'cancelado', completed_at = now(), erro = coalesce(erro, 'Cancelado pelo administrador.')
  where id = p_id and status in ('pendente', 'processando', 'erro');
  if not found then raise exception 'Trabalho não encontrado ou já finalizado.'; end if;
end;
$$;

revoke all on function public.cardapio_exemplo_cancelar_impressao(uuid) from public, anon;
grant execute on function public.cardapio_exemplo_cancelar_impressao(uuid) to authenticated, service_role;

create or replace function public.cardapio_exemplo_enfileirar_reimpressao(p_pedido_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_job_id uuid;
  v_job_key text;
begin
  if not public.cardapio_exemplo_e_admin() then
    raise exception 'Acesso negado.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.cardapio_exemplo_pedidos where id = p_pedido_id) then
    raise exception 'Pedido não encontrado.';
  end if;

  v_job_key := 'pedido:' || p_pedido_id::text || ':principal:reimpressao:' || replace(gen_random_uuid()::text, '-', '');
  insert into public.cardapio_exemplo_fila_impressao
    (pedido_id, tipo, setor, job_key, status, payload, largura_mm, reimpressao, solicitado_por)
  values
    (p_pedido_id, 'pedido', 'principal', v_job_key, 'pendente',
     public.cardapio_exemplo_payload_impressao(p_pedido_id), null, true, auth.uid())
  returning id into v_job_id;

  return v_job_id;
end;
$$;

revoke all on function public.cardapio_exemplo_enfileirar_reimpressao(uuid) from public, anon;
grant execute on function public.cardapio_exemplo_enfileirar_reimpressao(uuid) to authenticated, service_role;

create or replace function public.cardapio_exemplo_enfileirar_teste(p_impressora_id uuid default null)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_job_id uuid;
  v_job_key text;
  v_cfg public.cardapio_exemplo_configuracoes%rowtype;
begin
  if not public.cardapio_exemplo_e_admin() then
    raise exception 'Acesso negado.' using errcode = '42501';
  end if;
  if p_impressora_id is not null and not exists (
    select 1 from public.cardapio_exemplo_impressoras where id = p_impressora_id
  ) then
    raise exception 'Impressora não encontrada.';
  end if;

  select * into v_cfg from public.cardapio_exemplo_configuracoes where id = 1;
  v_job_key := 'teste:' || replace(gen_random_uuid()::text, '-', '');
  insert into public.cardapio_exemplo_fila_impressao
    (pedido_id, impressora_id, tipo, setor, job_key, status, payload, largura_mm, solicitado_por)
  values
    (null, p_impressora_id, 'teste', 'principal', v_job_key, 'pendente',
     jsonb_build_object(
       'teste', true,
       'gerado_em', now(),
       'estabelecimento', jsonb_build_object('nome', coalesce(v_cfg.nome_estabelecimento, 'BOM PA POXA')),
       'mensagem', 'Teste de impressão do painel BOM PA POXA.'
     ),
     null, auth.uid())
  returning id into v_job_id;

  return v_job_id;
end;
$$;

revoke all on function public.cardapio_exemplo_enfileirar_teste(uuid) from public, anon;
grant execute on function public.cardapio_exemplo_enfileirar_teste(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 9. RLS e grants
-- ---------------------------------------------------------------------------

alter table public.cardapio_exemplo_pagamento_config enable row level security;
alter table public.cardapio_exemplo_pagamentos enable row level security;
alter table public.cardapio_exemplo_pagamento_eventos enable row level security;
alter table public.cardapio_exemplo_webhooks_processados enable row level security;
alter table public.cardapio_exemplo_impressoras enable row level security;
alter table public.cardapio_exemplo_fila_impressao enable row level security;

drop policy if exists "cardapio_exemplo_pagamento_config_admin_all" on public.cardapio_exemplo_pagamento_config;
create policy "cardapio_exemplo_pagamento_config_admin_all" on public.cardapio_exemplo_pagamento_config
  for all to authenticated
  using (public.cardapio_exemplo_e_admin())
  with check (public.cardapio_exemplo_e_admin());

drop policy if exists "cardapio_exemplo_pagamentos_admin_read" on public.cardapio_exemplo_pagamentos;
create policy "cardapio_exemplo_pagamentos_admin_read" on public.cardapio_exemplo_pagamentos
  for select to authenticated using (public.cardapio_exemplo_e_admin());

drop policy if exists "cardapio_exemplo_pagamento_eventos_admin_read" on public.cardapio_exemplo_pagamento_eventos;
create policy "cardapio_exemplo_pagamento_eventos_admin_read" on public.cardapio_exemplo_pagamento_eventos
  for select to authenticated using (public.cardapio_exemplo_e_admin());

drop policy if exists "cardapio_exemplo_webhooks_admin_read" on public.cardapio_exemplo_webhooks_processados;
create policy "cardapio_exemplo_webhooks_admin_read" on public.cardapio_exemplo_webhooks_processados
  for select to authenticated using (public.cardapio_exemplo_e_admin());

drop policy if exists "cardapio_exemplo_impressoras_admin_all" on public.cardapio_exemplo_impressoras;
create policy "cardapio_exemplo_impressoras_admin_all" on public.cardapio_exemplo_impressoras
  for all to authenticated
  using (public.cardapio_exemplo_e_admin())
  with check (public.cardapio_exemplo_e_admin());

drop policy if exists "cardapio_exemplo_fila_impressao_admin_read" on public.cardapio_exemplo_fila_impressao;
create policy "cardapio_exemplo_fila_impressao_admin_read" on public.cardapio_exemplo_fila_impressao
  for select to authenticated using (public.cardapio_exemplo_e_admin());

revoke all on table
  public.cardapio_exemplo_pagamento_config,
  public.cardapio_exemplo_pagamentos,
  public.cardapio_exemplo_pagamento_eventos,
  public.cardapio_exemplo_webhooks_processados,
  public.cardapio_exemplo_impressoras,
  public.cardapio_exemplo_fila_impressao
from anon, authenticated;

grant select on table
  public.cardapio_exemplo_pagamento_config,
  public.cardapio_exemplo_pagamentos,
  public.cardapio_exemplo_pagamento_eventos,
  public.cardapio_exemplo_webhooks_processados,
  public.cardapio_exemplo_impressoras,
  public.cardapio_exemplo_fila_impressao
to authenticated;

grant update on table public.cardapio_exemplo_pagamento_config to authenticated;
grant update on table public.cardapio_exemplo_impressoras to authenticated;

grant all on table
  public.cardapio_exemplo_pagamento_config,
  public.cardapio_exemplo_pagamentos,
  public.cardapio_exemplo_pagamento_eventos,
  public.cardapio_exemplo_webhooks_processados,
  public.cardapio_exemplo_impressoras,
  public.cardapio_exemplo_fila_impressao
to service_role;

notify pgrst, 'reload schema';

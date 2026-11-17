-- BOM PA POXA — schema isolado no projeto Supabase compartilhado.
-- Todas as tabelas, tipos, funções, triggers e políticas usam o prefixo cardapio_exemplo_.
-- Este arquivo não altera nem remove objetos de outros aplicativos.

do $$ begin
  create type public.cardapio_exemplo_modalidade as enum ('delivery', 'retirada');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.cardapio_exemplo_forma_pagamento as enum ('pix', 'dinheiro', 'cartao');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.cardapio_exemplo_status_pagamento as enum ('pendente', 'pago', 'cancelado');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.cardapio_exemplo_status_pedido as enum ('novo', 'em_preparo', 'pronto', 'saiu_entrega', 'entregue', 'retirado', 'cancelado');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.cardapio_exemplo_tipo_cupom as enum ('percentual', 'valor_fixo');
exception when duplicate_object then null; end $$;

create or replace function public.cardapio_exemplo_set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create table if not exists public.cardapio_exemplo_perfis (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text,
  papel text not null default 'cliente' check (papel in ('admin', 'cliente')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cardapio_exemplo_configuracoes (
  id smallint primary key default 1 check (id = 1),
  nome_estabelecimento text not null default 'BOM PA POXA' check (char_length(trim(nome_estabelecimento)) between 2 and 120),
  descricao text check (descricao is null or char_length(descricao) <= 500),
  logo_url text,
  banner_url text,
  instagram_url text,
  whatsapp text,
  telefone text,
  email text,
  endereco text,
  bairro text,
  cidade text,
  estado text,
  cep text,
  mapa_url text,
  cor_primaria text not null default '#B23A2A' check (cor_primaria ~ '^#[0-9A-Fa-f]{6}$'),
  cor_secundaria text not null default '#F1E3CF' check (cor_secundaria ~ '^#[0-9A-Fa-f]{6}$'),
  cor_destaque text not null default '#E8A33D' check (cor_destaque ~ '^#[0-9A-Fa-f]{6}$'),
  cor_fundo text not null default '#FAF5EC' check (cor_fundo ~ '^#[0-9A-Fa-f]{6}$'),
  cor_texto text not null default '#2A1710' check (cor_texto ~ '^#[0-9A-Fa-f]{6}$'),
  tipografia text not null default 'fraunces_figtree' check (tipografia in ('fraunces_figtree', 'bricolage_figtree', 'playfair_dm')),
  aceita_delivery boolean not null default true,
  aceita_retirada boolean not null default true,
  taxa_entrega numeric(10,2) not null default 0 check (taxa_entrega >= 0),
  frete_gratis_acima_de numeric(10,2) check (frete_gratis_acima_de is null or frete_gratis_acima_de >= 0),
  pedido_minimo numeric(10,2) not null default 0 check (pedido_minimo >= 0),
  tempo_entrega_min integer not null default 45 check (tempo_entrega_min >= 0),
  tempo_retirada_min integer not null default 20 check (tempo_retirada_min >= 0),
  status_abertura text not null default 'automatico' check (status_abertura in ('automatico', 'aberto', 'fechado')),
  aceitando_pedidos boolean not null default true,
  formas_pagamento text[] not null default array['pix', 'dinheiro', 'cartao']::text[]
    check (formas_pagamento <@ array['pix', 'dinheiro', 'cartao']::text[] and array_length(formas_pagamento, 1) >= 1),
  mensagem_boas_vindas text check (mensagem_boas_vindas is null or char_length(mensagem_boas_vindas) <= 300),
  rodape text check (rodape is null or char_length(rodape) <= 300),
  updated_at timestamptz not null default now(),
  check (aceita_delivery or aceita_retirada)
);

create table if not exists public.cardapio_exemplo_horarios (
  id uuid primary key default gen_random_uuid(),
  dia_semana smallint not null check (dia_semana between 0 and 6),
  sequencia smallint not null default 1 check (sequencia between 1 and 4),
  fechado boolean not null default false,
  abre time,
  fecha time,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (dia_semana, sequencia),
  check (fechado or (abre is not null and fecha is not null and abre <> fecha))
);

create table if not exists public.cardapio_exemplo_categorias (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (char_length(trim(nome)) between 1 and 80),
  descricao text check (descricao is null or char_length(descricao) <= 500),
  imagem_url text,
  ordem integer not null default 0,
  ativo boolean not null default true,
  destaque boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cardapio_exemplo_produtos (
  id uuid primary key default gen_random_uuid(),
  categoria_id uuid not null references public.cardapio_exemplo_categorias(id) on delete restrict,
  nome text not null check (char_length(trim(nome)) between 1 and 120),
  descricao text check (descricao is null or char_length(descricao) <= 1200),
  preco numeric(10,2) not null check (preco >= 0),
  preco_promocional numeric(10,2) check (preco_promocional is null or (preco_promocional >= 0 and preco_promocional <= preco)),
  imagem_url text,
  galeria text[] not null default '{}'::text[],
  ingredientes text[] not null default '{}'::text[],
  disponivel boolean not null default true,
  destaque boolean not null default false,
  tempo_preparo_min integer check (tempo_preparo_min is null or tempo_preparo_min >= 0),
  ordem integer not null default 0,
  ativo boolean not null default true,
  min_adicionais integer not null default 0 check (min_adicionais >= 0),
  max_adicionais integer not null default 20 check (max_adicionais >= min_adicionais),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cardapio_exemplo_adicionais (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid not null references public.cardapio_exemplo_produtos(id) on delete cascade,
  nome text not null check (char_length(trim(nome)) between 1 and 80),
  descricao text check (descricao is null or char_length(descricao) <= 300),
  preco numeric(10,2) not null default 0 check (preco >= 0),
  imagem_url text,
  grupo text not null default 'Opcionais' check (char_length(trim(grupo)) between 1 and 60),
  obrigatorio boolean not null default false,
  min_qtd integer not null default 0 check (min_qtd >= 0),
  max_qtd integer not null default 10 check (max_qtd >= 1 and max_qtd >= min_qtd),
  disponivel boolean not null default true,
  ordem integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cardapio_exemplo_combos (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (char_length(trim(nome)) between 1 and 120),
  descricao text check (descricao is null or char_length(descricao) <= 1200),
  imagem_url text,
  preco numeric(10,2) not null check (preco >= 0),
  disponivel boolean not null default true,
  destaque boolean not null default false,
  ordem integer not null default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cardapio_exemplo_combo_itens (
  id uuid primary key default gen_random_uuid(),
  combo_id uuid not null references public.cardapio_exemplo_combos(id) on delete cascade,
  produto_id uuid not null references public.cardapio_exemplo_produtos(id) on delete restrict,
  quantidade integer not null default 1 check (quantidade > 0 and quantidade <= 50),
  unique (combo_id, produto_id)
);

create table if not exists public.cardapio_exemplo_banners (
  id uuid primary key default gen_random_uuid(),
  titulo text not null check (char_length(trim(titulo)) between 1 and 120),
  subtitulo text check (subtitulo is null or char_length(subtitulo) <= 300),
  imagem_url text,
  link_url text,
  ordem integer not null default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cardapio_exemplo_cupons (
  id uuid primary key default gen_random_uuid(),
  codigo text not null check (codigo = upper(codigo) and char_length(codigo) between 3 and 40),
  tipo public.cardapio_exemplo_tipo_cupom not null,
  valor numeric(10,2) not null check (valor > 0),
  pedido_minimo numeric(10,2) not null default 0 check (pedido_minimo >= 0),
  desconto_maximo numeric(10,2) check (desconto_maximo is null or desconto_maximo > 0),
  usos_maximos integer check (usos_maximos is null or usos_maximos > 0),
  usos integer not null default 0 check (usos >= 0),
  valido_de timestamptz,
  valido_ate timestamptz,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (codigo),
  check (valido_de is null or valido_ate is null or valido_ate > valido_de),
  check (tipo <> 'percentual' or valor <= 100)
);

create table if not exists public.cardapio_exemplo_pedidos (
  id uuid primary key default gen_random_uuid(),
  numero bigint generated always as identity (start with 1001) unique,
  cliente_nome text not null check (char_length(trim(cliente_nome)) between 2 and 120),
  cliente_telefone text not null check (char_length(trim(cliente_telefone)) between 8 and 30),
  cliente_email text check (cliente_email is null or char_length(cliente_email) <= 160),
  modalidade public.cardapio_exemplo_modalidade not null,
  cep text,
  endereco text,
  numero_endereco text,
  complemento text,
  bairro text,
  cidade text,
  referencia text,
  forma_pagamento public.cardapio_exemplo_forma_pagamento not null,
  troco_para numeric(10,2) check (troco_para is null or troco_para >= 0),
  status public.cardapio_exemplo_status_pedido not null default 'novo',
  status_pagamento public.cardapio_exemplo_status_pagamento not null default 'pendente',
  subtotal numeric(10,2) not null default 0 check (subtotal >= 0),
  taxa_entrega numeric(10,2) not null default 0 check (taxa_entrega >= 0),
  desconto numeric(10,2) not null default 0 check (desconto >= 0),
  total numeric(10,2) not null default 0 check (total >= 0),
  cupom_codigo text,
  observacoes text check (observacoes is null or char_length(observacoes) <= 1000),
  tracking_token uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (total = subtotal + taxa_entrega - desconto),
  check (modalidade <> 'delivery' or (endereco is not null and numero_endereco is not null and bairro is not null and cidade is not null))
);

create table if not exists public.cardapio_exemplo_itens_pedido (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.cardapio_exemplo_pedidos(id) on delete cascade,
  produto_id uuid references public.cardapio_exemplo_produtos(id) on delete set null,
  combo_id uuid references public.cardapio_exemplo_combos(id) on delete set null,
  nome text not null,
  preco_unitario numeric(10,2) not null check (preco_unitario >= 0),
  quantidade integer not null check (quantidade > 0 and quantidade <= 50),
  adicionais jsonb not null default '[]'::jsonb check (jsonb_typeof(adicionais) = 'array'),
  observacao text check (observacao is null or char_length(observacao) <= 200),
  created_at timestamptz not null default now()
);

create table if not exists public.cardapio_exemplo_historico_pedidos (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.cardapio_exemplo_pedidos(id) on delete cascade,
  status_anterior public.cardapio_exemplo_status_pedido,
  status_novo public.cardapio_exemplo_status_pedido not null,
  observacao text,
  criado_por uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.cardapio_exemplo_avaliacoes (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.cardapio_exemplo_pedidos(id) on delete cascade,
  cliente_nome text,
  nota smallint not null check (nota between 1 and 5),
  comentario text check (comentario is null or char_length(comentario) <= 1000),
  aprovado boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (pedido_id)
);

create index if not exists cardapio_exemplo_categorias_ordem_idx on public.cardapio_exemplo_categorias (ativo, ordem);
create index if not exists cardapio_exemplo_produtos_categoria_idx on public.cardapio_exemplo_produtos (categoria_id, ativo, ordem);
create index if not exists cardapio_exemplo_produtos_destaque_idx on public.cardapio_exemplo_produtos (destaque) where ativo;
create index if not exists cardapio_exemplo_adicionais_produto_idx on public.cardapio_exemplo_adicionais (produto_id, disponivel, ordem);
create index if not exists cardapio_exemplo_combo_itens_combo_idx on public.cardapio_exemplo_combo_itens (combo_id);
create index if not exists cardapio_exemplo_combo_itens_produto_idx on public.cardapio_exemplo_combo_itens (produto_id);
create index if not exists cardapio_exemplo_banners_ordem_idx on public.cardapio_exemplo_banners (ativo, ordem);
create index if not exists cardapio_exemplo_cupons_codigo_idx on public.cardapio_exemplo_cupons (lower(codigo));
create index if not exists cardapio_exemplo_pedidos_created_idx on public.cardapio_exemplo_pedidos (created_at desc);
create index if not exists cardapio_exemplo_pedidos_status_idx on public.cardapio_exemplo_pedidos (status, created_at desc);
create index if not exists cardapio_exemplo_itens_pedido_pedido_idx on public.cardapio_exemplo_itens_pedido (pedido_id);
create index if not exists cardapio_exemplo_historico_pedido_idx on public.cardapio_exemplo_historico_pedidos (pedido_id, created_at);
create index if not exists cardapio_exemplo_avaliacoes_aprovado_idx on public.cardapio_exemplo_avaliacoes (aprovado, created_at desc);
create index if not exists cardapio_exemplo_horarios_dia_idx on public.cardapio_exemplo_horarios (dia_semana, sequencia);

drop trigger if exists cardapio_exemplo_tg_configuracoes_updated on public.cardapio_exemplo_configuracoes;
create trigger cardapio_exemplo_tg_configuracoes_updated before update on public.cardapio_exemplo_configuracoes
for each row execute function public.cardapio_exemplo_set_updated_at();

drop trigger if exists cardapio_exemplo_tg_horarios_updated on public.cardapio_exemplo_horarios;
create trigger cardapio_exemplo_tg_horarios_updated before update on public.cardapio_exemplo_horarios
for each row execute function public.cardapio_exemplo_set_updated_at();

drop trigger if exists cardapio_exemplo_tg_categorias_updated on public.cardapio_exemplo_categorias;
create trigger cardapio_exemplo_tg_categorias_updated before update on public.cardapio_exemplo_categorias
for each row execute function public.cardapio_exemplo_set_updated_at();

drop trigger if exists cardapio_exemplo_tg_produtos_updated on public.cardapio_exemplo_produtos;
create trigger cardapio_exemplo_tg_produtos_updated before update on public.cardapio_exemplo_produtos
for each row execute function public.cardapio_exemplo_set_updated_at();

drop trigger if exists cardapio_exemplo_tg_adicionais_updated on public.cardapio_exemplo_adicionais;
create trigger cardapio_exemplo_tg_adicionais_updated before update on public.cardapio_exemplo_adicionais
for each row execute function public.cardapio_exemplo_set_updated_at();

drop trigger if exists cardapio_exemplo_tg_combos_updated on public.cardapio_exemplo_combos;
create trigger cardapio_exemplo_tg_combos_updated before update on public.cardapio_exemplo_combos
for each row execute function public.cardapio_exemplo_set_updated_at();

drop trigger if exists cardapio_exemplo_tg_banners_updated on public.cardapio_exemplo_banners;
create trigger cardapio_exemplo_tg_banners_updated before update on public.cardapio_exemplo_banners
for each row execute function public.cardapio_exemplo_set_updated_at();

drop trigger if exists cardapio_exemplo_tg_cupons_updated on public.cardapio_exemplo_cupons;
create trigger cardapio_exemplo_tg_cupons_updated before update on public.cardapio_exemplo_cupons
for each row execute function public.cardapio_exemplo_set_updated_at();

drop trigger if exists cardapio_exemplo_tg_pedidos_updated on public.cardapio_exemplo_pedidos;
create trigger cardapio_exemplo_tg_pedidos_updated before update on public.cardapio_exemplo_pedidos
for each row execute function public.cardapio_exemplo_set_updated_at();

drop trigger if exists cardapio_exemplo_tg_avaliacoes_updated on public.cardapio_exemplo_avaliacoes;
create trigger cardapio_exemplo_tg_avaliacoes_updated before update on public.cardapio_exemplo_avaliacoes
for each row execute function public.cardapio_exemplo_set_updated_at();

create or replace function public.cardapio_exemplo_e_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.cardapio_exemplo_perfis
    where id = auth.uid() and papel = 'admin'
  );
$$;

revoke all on function public.cardapio_exemplo_e_admin() from public, anon;
grant execute on function public.cardapio_exemplo_e_admin() to authenticated, service_role;

create or replace function public.cardapio_exemplo_guardar_papel_perfil()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    if coalesce(auth.role(), 'service_role') = 'authenticated' or coalesce(auth.role(), '') = 'anon' then
      new.papel := 'cliente';
    end if;
  elsif new.papel is distinct from old.papel then
    if coalesce(auth.role(), 'service_role') <> 'service_role' then
      raise exception 'A função do perfil não pode ser alterada pelo cliente';
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists cardapio_exemplo_tg_perfis_guard on public.cardapio_exemplo_perfis;
create trigger cardapio_exemplo_tg_perfis_guard before insert or update on public.cardapio_exemplo_perfis
for each row execute function public.cardapio_exemplo_guardar_papel_perfil();

create or replace function public.cardapio_exemplo_promover_admin(p_email text)
returns uuid
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_id uuid;
  v_nome text;
begin
  select u.id, coalesce(nullif(u.raw_user_meta_data->>'full_name', ''), split_part(u.email, '@', 1))
    into v_id, v_nome
  from auth.users u
  where lower(u.email) = lower(trim(p_email))
  limit 1;

  if v_id is null then
    raise exception 'Usuário com o e-mail % não encontrado em auth.users', p_email;
  end if;

  insert into public.cardapio_exemplo_perfis (id, nome, papel)
  values (v_id, v_nome, 'admin')
  on conflict (id) do update set papel = 'admin', nome = coalesce(public.cardapio_exemplo_perfis.nome, excluded.nome), updated_at = now();

  return v_id;
end;
$$;

revoke all on function public.cardapio_exemplo_promover_admin(text) from public, anon, authenticated;
grant execute on function public.cardapio_exemplo_promover_admin(text) to service_role;

create or replace function public.cardapio_exemplo_esta_aberto()
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_status text;
  v_dow integer;
  v_ontem integer;
  v_hora time;
begin
  select status_abertura into v_status from public.cardapio_exemplo_configuracoes where id = 1;
  if not found then return false; end if;
  if v_status = 'aberto' then return true; end if;
  if v_status = 'fechado' then return false; end if;

  v_dow := extract(dow from (now() at time zone 'America/Bahia'))::integer;
  v_hora := (now() at time zone 'America/Bahia')::time;
  v_ontem := (v_dow + 6) % 7;

  return exists (
    select 1
    from public.cardapio_exemplo_horarios h
    where not h.fechado
      and h.abre is not null
      and h.fecha is not null
      and (
        (h.dia_semana = v_dow and h.abre < h.fecha and v_hora >= h.abre and v_hora < h.fecha)
        or (h.dia_semana = v_dow and h.abre > h.fecha and v_hora >= h.abre)
        or (h.dia_semana = v_ontem and h.abre > h.fecha and v_hora < h.fecha)
      )
  );
end;
$$;

revoke all on function public.cardapio_exemplo_esta_aberto() from public;
grant execute on function public.cardapio_exemplo_esta_aberto() to anon, authenticated, service_role;

create or replace function public.cardapio_exemplo_registrar_historico()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.cardapio_exemplo_historico_pedidos (pedido_id, status_anterior, status_novo, observacao, criado_por)
    values (new.id, null, new.status, 'Pedido criado', auth.uid());
  elsif new.status is distinct from old.status then
    insert into public.cardapio_exemplo_historico_pedidos (pedido_id, status_anterior, status_novo, observacao, criado_por)
    values (new.id, old.status, new.status, 'Status atualizado', auth.uid());
  end if;
  return new;
end;
$$;

drop trigger if exists cardapio_exemplo_tg_pedidos_historico on public.cardapio_exemplo_pedidos;
create trigger cardapio_exemplo_tg_pedidos_historico after insert or update of status on public.cardapio_exemplo_pedidos
for each row execute function public.cardapio_exemplo_registrar_historico();

create or replace function public.cardapio_exemplo_validar_cupom(p_codigo text, p_subtotal numeric)
returns table (valido boolean, desconto numeric, mensagem text)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_cupom public.cardapio_exemplo_cupons%rowtype;
  v_desc numeric := 0;
begin
  if p_codigo is null or trim(p_codigo) = '' then
    return query select false, 0::numeric, 'Informe um código de cupom.'::text;
    return;
  end if;

  select * into v_cupom
  from public.cardapio_exemplo_cupons
  where codigo = upper(trim(p_codigo));

  if not found then
    return query select false, 0::numeric, 'Cupom não encontrado.'::text;
    return;
  end if;
  if not v_cupom.ativo then
    return query select false, 0::numeric, 'Este cupom não está mais ativo.'::text;
    return;
  end if;
  if v_cupom.valido_de is not null and now() < v_cupom.valido_de then
    return query select false, 0::numeric, 'Este cupom ainda não é válido.'::text;
    return;
  end if;
  if v_cupom.valido_ate is not null and now() > v_cupom.valido_ate then
    return query select false, 0::numeric, 'Este cupom expirou.'::text;
    return;
  end if;
  if v_cupom.usos_maximos is not null and v_cupom.usos >= v_cupom.usos_maximos then
    return query select false, 0::numeric, 'Este cupom já atingiu o limite de usos.'::text;
    return;
  end if;
  if p_subtotal < v_cupom.pedido_minimo then
    return query select false, 0::numeric, format('Este cupom é válido para pedidos a partir de R$ %s.', replace(to_char(v_cupom.pedido_minimo, 'FM999999990D00'), '.', ','))::text;
    return;
  end if;

  if v_cupom.tipo = 'percentual' then
    v_desc := round(p_subtotal * v_cupom.valor / 100, 2);
  else
    v_desc := v_cupom.valor;
  end if;
  if v_cupom.desconto_maximo is not null then
    v_desc := least(v_desc, v_cupom.desconto_maximo);
  end if;
  v_desc := least(v_desc, p_subtotal);

  return query select true, v_desc, format('Cupom aplicado: R$ %s de desconto.', replace(to_char(v_desc, 'FM999999990D00'), '.', ','))::text;
end;
$$;

revoke all on function public.cardapio_exemplo_validar_cupom(text, numeric) from public;
grant execute on function public.cardapio_exemplo_validar_cupom(text, numeric) to anon, authenticated, service_role;

create or replace function public.cardapio_exemplo_place_order(
  p_cliente_nome text,
  p_cliente_telefone text,
  p_cliente_email text,
  p_modalidade public.cardapio_exemplo_modalidade,
  p_endereco jsonb,
  p_itens jsonb,
  p_forma_pagamento public.cardapio_exemplo_forma_pagamento,
  p_troco_para numeric,
  p_observacoes text,
  p_cupom text
)
returns table (
  pedido_id uuid,
  numero bigint,
  tracking_token uuid,
  subtotal numeric,
  taxa_entrega numeric,
  desconto numeric,
  total numeric
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_cfg public.cardapio_exemplo_configuracoes%rowtype;
  v_pedido_id uuid;
  v_numero bigint;
  v_token uuid;
  v_item jsonb;
  v_qtd integer;
  v_produto public.cardapio_exemplo_produtos%rowtype;
  v_combo public.cardapio_exemplo_combos%rowtype;
  v_addon_ids uuid[];
  v_addons jsonb;
  v_soma_adicionais numeric;
  v_preco_unitario numeric;
  v_subtotal numeric := 0;
  v_taxa numeric := 0;
  v_desconto numeric := 0;
  v_total numeric := 0;
  v_cupom public.cardapio_exemplo_cupons%rowtype;
  v_grupo record;
  v_grupo_qtd integer;
  v_qtd_adicionais integer;
  v_cep text;
  v_endereco text;
  v_numero_endereco text;
  v_complemento text;
  v_bairro text;
  v_cidade text;
  v_referencia text;
  v_digitos text;
  v_obs text;
  v_cupom_codigo text;
begin
  select * into v_cfg from public.cardapio_exemplo_configuracoes where id = 1;
  if not found then raise exception 'Cardápio ainda não configurado.'; end if;
  if not v_cfg.aceitando_pedidos then raise exception 'Os pedidos estão pausados neste momento.'; end if;
  if not public.cardapio_exemplo_esta_aberto() then raise exception 'A loja está fechada neste momento.'; end if;

  if p_cliente_nome is null or char_length(trim(p_cliente_nome)) < 2 then
    raise exception 'Informe seu nome completo.';
  end if;
  if p_cliente_telefone is null then raise exception 'Informe um telefone para contato.'; end if;
  v_digitos := regexp_replace(p_cliente_telefone, '\D', '', 'g');
  if char_length(v_digitos) < 8 or char_length(v_digitos) > 15 then
    raise exception 'Informe um telefone válido com DDD.';
  end if;

  if p_modalidade = 'delivery' and not v_cfg.aceita_delivery then raise exception 'Entrega desativada no momento.'; end if;
  if p_modalidade = 'retirada' and not v_cfg.aceita_retirada then raise exception 'Retirada desativada no momento.'; end if;
  if p_modalidade = 'delivery' then
    if coalesce(trim(p_endereco->>'endereco'), '') = '' or coalesce(trim(p_endereco->>'numero'), '') = '' or coalesce(trim(p_endereco->>'bairro'), '') = '' or coalesce(trim(p_endereco->>'cidade'), '') = '' then
      raise exception 'Informe o endereço completo para entrega.';
    end if;
  end if;

  if not (p_forma_pagamento::text = any(v_cfg.formas_pagamento)) then
    raise exception 'Forma de pagamento indisponível.';
  end if;

  if p_itens is null or jsonb_typeof(p_itens) <> 'array' or jsonb_array_length(p_itens) < 1 or jsonb_array_length(p_itens) > 50 then
    raise exception 'Seu carrinho está vazio ou possui itens demais.';
  end if;

  v_cep := nullif(trim(p_endereco->>'cep'), '');
  v_endereco := nullif(trim(p_endereco->>'endereco'), '');
  v_numero_endereco := nullif(trim(p_endereco->>'numero'), '');
  v_complemento := nullif(trim(p_endereco->>'complemento'), '');
  v_bairro := nullif(trim(p_endereco->>'bairro'), '');
  v_cidade := nullif(trim(p_endereco->>'cidade'), '');
  v_referencia := nullif(trim(p_endereco->>'referencia'), '');
  v_obs := nullif(trim(p_observacoes), '');
  if v_obs is not null and char_length(v_obs) > 1000 then raise exception 'As observações são longas demais.'; end if;

  insert into public.cardapio_exemplo_pedidos (
    cliente_nome, cliente_telefone, cliente_email, modalidade,
    cep, endereco, numero_endereco, complemento, bairro, cidade, referencia,
    forma_pagamento, observacoes
  ) values (
    trim(p_cliente_nome), trim(p_cliente_telefone), nullif(trim(p_cliente_email), ''), p_modalidade,
    v_cep, v_endereco, v_numero_endereco, v_complemento, v_bairro, v_cidade, v_referencia,
    p_forma_pagamento, v_obs
  )
  returning cardapio_exemplo_pedidos.id, cardapio_exemplo_pedidos.numero, cardapio_exemplo_pedidos.tracking_token
  into v_pedido_id, v_numero, v_token;

  for v_item in select * from jsonb_array_elements(p_itens)
  loop
    v_qtd := coalesce((v_item->>'quantidade')::integer, 0);
    if v_qtd < 1 or v_qtd > 30 then raise exception 'Quantidade inválida em um dos itens.'; end if;

    v_addons := '[]'::jsonb;
    v_addon_ids := '{}'::uuid[];
    v_soma_adicionais := 0;

    if nullif(v_item->>'produto_id', '') is not null then
      select p.* into v_produto
      from public.cardapio_exemplo_produtos p
      join public.cardapio_exemplo_categorias c on c.id = p.categoria_id
      where p.id = (v_item->>'produto_id')::uuid
        and p.ativo
        and c.ativo;
      if not found then raise exception 'Um dos produtos não está mais disponível.'; end if;
      if not v_produto.disponivel then raise exception 'O produto % está esgotado.', v_produto.nome; end if;

      select coalesce(array_agg(distinct x::uuid), '{}'::uuid[]) into v_addon_ids
      from jsonb_array_elements_text(coalesce(v_item->'adicionais', '[]'::jsonb)) x;

      v_qtd_adicionais := cardinality(v_addon_ids);
      if v_qtd_adicionais > 20 then raise exception 'Adicionais demais em um dos itens.'; end if;
      if v_qtd_adicionais < v_produto.min_adicionais then raise exception 'Escolha os adicionais obrigatórios de %.', v_produto.nome; end if;
      if v_qtd_adicionais > v_produto.max_adicionais then raise exception 'Adicionais demais em %.', v_produto.nome; end if;

      select count(*) into v_grupo_qtd
      from public.cardapio_exemplo_adicionais a
      where a.id = any(v_addon_ids)
        and a.produto_id = v_produto.id
        and a.disponivel;
      if v_grupo_qtd <> v_qtd_adicionais then
        raise exception 'Um dos adicionais não está mais disponível.';
      end if;

      for v_grupo in
        select a.grupo, max(a.min_qtd) as min_qtd, max(a.max_qtd) as max_qtd, bool_or(a.obrigatorio) as obrigatorio
        from public.cardapio_exemplo_adicionais a
        where a.produto_id = v_produto.id and a.disponivel
        group by a.grupo
      loop
        select count(*) into v_grupo_qtd
        from public.cardapio_exemplo_adicionais a
        where a.produto_id = v_produto.id
          and a.disponivel
          and a.grupo = v_grupo.grupo
          and a.id = any(v_addon_ids);
        if (v_grupo.obrigatorio and v_grupo_qtd = 0) or v_grupo_qtd < v_grupo.min_qtd then
          raise exception 'Escolha ao menos % opção(ões) do grupo %.', greatest(v_grupo.min_qtd, case when v_grupo.obrigatorio then 1 else 0 end), v_grupo.grupo;
        end if;
        if v_grupo_qtd > v_grupo.max_qtd then
          raise exception 'Escolha no máximo % opção(ões) do grupo %.', v_grupo.max_qtd, v_grupo.grupo;
        end if;
      end loop;

      select coalesce(jsonb_agg(jsonb_build_object('id', a.id, 'nome', a.nome, 'preco', a.preco) order by a.ordem), '[]'::jsonb),
             coalesce(sum(a.preco), 0)
        into v_addons, v_soma_adicionais
      from public.cardapio_exemplo_adicionais a
      where a.id = any(v_addon_ids)
        and a.produto_id = v_produto.id
        and a.disponivel;

      v_preco_unitario := coalesce(v_produto.preco_promocional, v_produto.preco) + v_soma_adicionais;
      insert into public.cardapio_exemplo_itens_pedido
        (pedido_id, produto_id, nome, preco_unitario, quantidade, adicionais, observacao)
      values
        (v_pedido_id, v_produto.id, v_produto.nome, v_preco_unitario, v_qtd, v_addons, left(nullif(trim(v_item->>'observacao'), ''), 200));

    elsif nullif(v_item->>'combo_id', '') is not null then
      select c.* into v_combo
      from public.cardapio_exemplo_combos c
      where c.id = (v_item->>'combo_id')::uuid and c.ativo;
      if not found then raise exception 'Um dos combos não está mais disponível.'; end if;
      if not v_combo.disponivel then raise exception 'O combo % está esgotado.', v_combo.nome; end if;
      if not exists (select 1 from public.cardapio_exemplo_combo_itens ci where ci.combo_id = v_combo.id) then
        raise exception 'O combo % está indisponível.', v_combo.nome;
      end if;

      select count(*) into v_grupo_qtd
      from public.cardapio_exemplo_combo_itens ci
      join public.cardapio_exemplo_produtos p on p.id = ci.produto_id
      join public.cardapio_exemplo_categorias cat on cat.id = p.categoria_id
      where ci.combo_id = v_combo.id
        and (not p.ativo or not p.disponivel or not cat.ativo);
      if v_grupo_qtd > 0 then raise exception 'O combo % possui um item indisponível.', v_combo.nome; end if;

      v_preco_unitario := v_combo.preco;
      insert into public.cardapio_exemplo_itens_pedido
        (pedido_id, combo_id, nome, preco_unitario, quantidade, adicionais, observacao)
      values
        (v_pedido_id, v_combo.id, v_combo.nome, v_preco_unitario, v_qtd, '[]'::jsonb, left(nullif(trim(v_item->>'observacao'), ''), 200));
    else
      raise exception 'Item inválido no carrinho.';
    end if;

    v_subtotal := v_subtotal + (v_preco_unitario * v_qtd);
  end loop;

  v_subtotal := round(v_subtotal, 2);
  if v_subtotal < v_cfg.pedido_minimo then
    raise exception 'O pedido mínimo é de R$ %.', replace(to_char(v_cfg.pedido_minimo, 'FM999999990D00'), '.', ',');
  end if;

  if p_modalidade = 'delivery' then
    if v_cfg.frete_gratis_acima_de is not null and v_subtotal >= v_cfg.frete_gratis_acima_de then
      v_taxa := 0;
    else
      v_taxa := v_cfg.taxa_entrega;
    end if;
  end if;

  v_cupom_codigo := nullif(upper(trim(p_cupom)), '');
  if v_cupom_codigo is not null then
    select * into v_cupom
    from public.cardapio_exemplo_cupons
    where codigo = v_cupom_codigo
    for update;
    if found then
      if not v_cupom.ativo then raise exception 'Este cupom não está mais ativo.'; end if;
      if v_cupom.valido_de is not null and now() < v_cupom.valido_de then raise exception 'Este cupom ainda não é válido.'; end if;
      if v_cupom.valido_ate is not null and now() > v_cupom.valido_ate then raise exception 'Este cupom expirou.'; end if;
      if v_cupom.usos_maximos is not null and v_cupom.usos >= v_cupom.usos_maximos then raise exception 'Este cupom atingiu o limite de usos.'; end if;
      if v_subtotal < v_cupom.pedido_minimo then raise exception 'Este cupom exige um pedido mínimo maior.'; end if;

      if v_cupom.tipo = 'percentual' then
        v_desconto := round(v_subtotal * v_cupom.valor / 100, 2);
      else
        v_desconto := v_cupom.valor;
      end if;
      if v_cupom.desconto_maximo is not null then v_desconto := least(v_desconto, v_cupom.desconto_maximo); end if;
      v_desconto := least(v_desconto, v_subtotal);

      update public.cardapio_exemplo_cupons
      set usos = usos + 1,
          ativo = case when usos_maximos is not null and usos + 1 >= usos_maximos then false else ativo end
      where id = v_cupom.id;
    else
      raise exception 'Cupom não encontrado.';
    end if;
  end if;

  v_total := round(v_subtotal + v_taxa - v_desconto, 2);
  if v_total < 0 then v_total := 0; end if;
  if p_forma_pagamento = 'dinheiro' and p_troco_para is not null and p_troco_para < v_total then
    raise exception 'O valor para troco é menor que o total do pedido.';
  end if;

  update public.cardapio_exemplo_pedidos
  set subtotal = v_subtotal,
      taxa_entrega = v_taxa,
      desconto = v_desconto,
      total = v_total,
      cupom_codigo = v_cupom_codigo,
      troco_para = case when p_forma_pagamento = 'dinheiro' then p_troco_para else null end
  where id = v_pedido_id;

  return query select v_pedido_id, v_numero, v_token, v_subtotal, v_taxa, v_desconto, v_total;
end;
$$;

revoke all on function public.cardapio_exemplo_place_order(text, text, text, public.cardapio_exemplo_modalidade, jsonb, jsonb, public.cardapio_exemplo_forma_pagamento, numeric, text, text) from public;
grant execute on function public.cardapio_exemplo_place_order(text, text, text, public.cardapio_exemplo_modalidade, jsonb, jsonb, public.cardapio_exemplo_forma_pagamento, numeric, text, text) to anon, authenticated, service_role;

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
    'cliente_nome', o.cliente_nome,
    'cliente_telefone', o.cliente_telefone,
    'modalidade', o.modalidade,
    'endereco', jsonb_strip_nulls(jsonb_build_object(
      'cep', o.cep, 'endereco', o.endereco, 'numero', o.numero_endereco,
      'complemento', o.complemento, 'bairro', o.bairro, 'cidade', o.cidade, 'referencia', o.referencia
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
    )
  )
  from public.cardapio_exemplo_pedidos o
  where o.id = p_pedido_id and o.tracking_token = p_token;
$$;

revoke all on function public.cardapio_exemplo_get_pedido(uuid, uuid) from public;
grant execute on function public.cardapio_exemplo_get_pedido(uuid, uuid) to anon, authenticated, service_role;

create or replace function public.cardapio_exemplo_submit_avaliacao(
  p_pedido_id uuid,
  p_token uuid,
  p_nome text,
  p_nota integer,
  p_comentario text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
  v_pedido public.cardapio_exemplo_pedidos%rowtype;
begin
  if p_nota < 1 or p_nota > 5 then raise exception 'A nota deve ser de 1 a 5 estrelas.'; end if;
  if p_comentario is not null and char_length(p_comentario) > 1000 then raise exception 'O comentário é longo demais.'; end if;

  select * into v_pedido
  from public.cardapio_exemplo_pedidos
  where id = p_pedido_id and tracking_token = p_token;
  if not found then raise exception 'Pedido não encontrado.'; end if;
  if v_pedido.status not in ('entregue', 'retirado') then raise exception 'A avaliação fica disponível após a entrega ou retirada.'; end if;
  if exists (select 1 from public.cardapio_exemplo_avaliacoes where pedido_id = p_pedido_id) then raise exception 'Este pedido já foi avaliado.'; end if;

  insert into public.cardapio_exemplo_avaliacoes (pedido_id, cliente_nome, nota, comentario)
  values (p_pedido_id, coalesce(nullif(trim(p_nome), ''), v_pedido.cliente_nome), p_nota, nullif(trim(p_comentario), ''))
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.cardapio_exemplo_submit_avaliacao(uuid, uuid, text, integer, text) from public;
grant execute on function public.cardapio_exemplo_submit_avaliacao(uuid, uuid, text, integer, text) to anon, authenticated, service_role;

create or replace function public.cardapio_exemplo_admin_salvar_combo(p_combo jsonb, p_itens jsonb)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
  v_item jsonb;
begin
  if not public.cardapio_exemplo_e_admin() then
    raise exception 'Acesso negado.' using errcode = '42501';
  end if;
  if p_combo is null or coalesce(trim(p_combo->>'nome'), '') = '' then
    raise exception 'Informe o nome do combo.';
  end if;
  if jsonb_typeof(coalesce(p_itens, '[]'::jsonb)) <> 'array' then
    raise exception 'Itens do combo inválidos.';
  end if;
  if jsonb_array_length(coalesce(p_itens, '[]'::jsonb)) = 0 then
    raise exception 'Inclua pelo menos um produto no combo.';
  end if;

  v_id := nullif(p_combo->>'id', '')::uuid;
  if v_id is null then
    insert into public.cardapio_exemplo_combos (nome, descricao, imagem_url, preco, disponivel, destaque, ordem, ativo)
    values (
      trim(p_combo->>'nome'),
      nullif(trim(p_combo->>'descricao'), ''),
      nullif(trim(p_combo->>'imagem_url'), ''),
      coalesce((p_combo->>'preco')::numeric, 0),
      coalesce((p_combo->>'disponivel')::boolean, true),
      coalesce((p_combo->>'destaque')::boolean, false),
      coalesce((p_combo->>'ordem')::integer, 0),
      coalesce((p_combo->>'ativo')::boolean, true)
    ) returning id into v_id;
  else
    update public.cardapio_exemplo_combos
    set nome = trim(p_combo->>'nome'),
        descricao = nullif(trim(p_combo->>'descricao'), ''),
        imagem_url = nullif(trim(p_combo->>'imagem_url'), ''),
        preco = coalesce((p_combo->>'preco')::numeric, 0),
        disponivel = coalesce((p_combo->>'disponivel')::boolean, true),
        destaque = coalesce((p_combo->>'destaque')::boolean, false),
        ordem = coalesce((p_combo->>'ordem')::integer, 0),
        ativo = coalesce((p_combo->>'ativo')::boolean, true)
    where id = v_id;
    if not found then raise exception 'Combo não encontrado.'; end if;
  end if;

  delete from public.cardapio_exemplo_combo_itens where combo_id = v_id;
  for v_item in select * from jsonb_array_elements(coalesce(p_itens, '[]'::jsonb))
  loop
    insert into public.cardapio_exemplo_combo_itens (combo_id, produto_id, quantidade)
    values (v_id, (v_item->>'produto_id')::uuid, coalesce((v_item->>'quantidade')::integer, 1));
  end loop;

  return v_id;
end;
$$;

revoke all on function public.cardapio_exemplo_admin_salvar_combo(jsonb, jsonb) from public, anon;
grant execute on function public.cardapio_exemplo_admin_salvar_combo(jsonb, jsonb) to authenticated, service_role;

alter table public.cardapio_exemplo_perfis enable row level security;
alter table public.cardapio_exemplo_configuracoes enable row level security;
alter table public.cardapio_exemplo_horarios enable row level security;
alter table public.cardapio_exemplo_categorias enable row level security;
alter table public.cardapio_exemplo_produtos enable row level security;
alter table public.cardapio_exemplo_adicionais enable row level security;
alter table public.cardapio_exemplo_combos enable row level security;
alter table public.cardapio_exemplo_combo_itens enable row level security;
alter table public.cardapio_exemplo_banners enable row level security;
alter table public.cardapio_exemplo_cupons enable row level security;
alter table public.cardapio_exemplo_pedidos enable row level security;
alter table public.cardapio_exemplo_itens_pedido enable row level security;
alter table public.cardapio_exemplo_historico_pedidos enable row level security;
alter table public.cardapio_exemplo_avaliacoes enable row level security;

drop policy if exists "cardapio_exemplo_perfis_select_proprio" on public.cardapio_exemplo_perfis;
create policy "cardapio_exemplo_perfis_select_proprio" on public.cardapio_exemplo_perfis
for select to authenticated using (id = auth.uid() or public.cardapio_exemplo_e_admin());

drop policy if exists "cardapio_exemplo_perfis_insert_proprio" on public.cardapio_exemplo_perfis;
create policy "cardapio_exemplo_perfis_insert_proprio" on public.cardapio_exemplo_perfis
for insert to authenticated with check (id = auth.uid() and papel = 'cliente');

drop policy if exists "cardapio_exemplo_perfis_update_proprio" on public.cardapio_exemplo_perfis;
create policy "cardapio_exemplo_perfis_update_proprio" on public.cardapio_exemplo_perfis
for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "cardapio_exemplo_configuracoes_public_read" on public.cardapio_exemplo_configuracoes;
create policy "cardapio_exemplo_configuracoes_public_read" on public.cardapio_exemplo_configuracoes
for select to anon, authenticated using (true);

drop policy if exists "cardapio_exemplo_configuracoes_admin_all" on public.cardapio_exemplo_configuracoes;
create policy "cardapio_exemplo_configuracoes_admin_all" on public.cardapio_exemplo_configuracoes
for all to authenticated using (public.cardapio_exemplo_e_admin()) with check (public.cardapio_exemplo_e_admin());

drop policy if exists "cardapio_exemplo_horarios_public_read" on public.cardapio_exemplo_horarios;
create policy "cardapio_exemplo_horarios_public_read" on public.cardapio_exemplo_horarios
for select to anon, authenticated using (true);

drop policy if exists "cardapio_exemplo_horarios_admin_all" on public.cardapio_exemplo_horarios;
create policy "cardapio_exemplo_horarios_admin_all" on public.cardapio_exemplo_horarios
for all to authenticated using (public.cardapio_exemplo_e_admin()) with check (public.cardapio_exemplo_e_admin());

drop policy if exists "cardapio_exemplo_categorias_public_read" on public.cardapio_exemplo_categorias;
create policy "cardapio_exemplo_categorias_public_read" on public.cardapio_exemplo_categorias
for select to anon, authenticated using (ativo);

drop policy if exists "cardapio_exemplo_categorias_admin_all" on public.cardapio_exemplo_categorias;
create policy "cardapio_exemplo_categorias_admin_all" on public.cardapio_exemplo_categorias
for all to authenticated using (public.cardapio_exemplo_e_admin()) with check (public.cardapio_exemplo_e_admin());

drop policy if exists "cardapio_exemplo_produtos_public_read" on public.cardapio_exemplo_produtos;
create policy "cardapio_exemplo_produtos_public_read" on public.cardapio_exemplo_produtos
for select to anon, authenticated using (
  ativo and exists (
    select 1 from public.cardapio_exemplo_categorias c
    where c.id = categoria_id and c.ativo
  )
);

drop policy if exists "cardapio_exemplo_produtos_admin_all" on public.cardapio_exemplo_produtos;
create policy "cardapio_exemplo_produtos_admin_all" on public.cardapio_exemplo_produtos
for all to authenticated using (public.cardapio_exemplo_e_admin()) with check (public.cardapio_exemplo_e_admin());

drop policy if exists "cardapio_exemplo_adicionais_public_read" on public.cardapio_exemplo_adicionais;
create policy "cardapio_exemplo_adicionais_public_read" on public.cardapio_exemplo_adicionais
for select to anon, authenticated using (
  disponivel and exists (
    select 1 from public.cardapio_exemplo_produtos p
    join public.cardapio_exemplo_categorias c on c.id = p.categoria_id
    where p.id = produto_id and p.ativo and c.ativo
  )
);

drop policy if exists "cardapio_exemplo_adicionais_admin_all" on public.cardapio_exemplo_adicionais;
create policy "cardapio_exemplo_adicionais_admin_all" on public.cardapio_exemplo_adicionais
for all to authenticated using (public.cardapio_exemplo_e_admin()) with check (public.cardapio_exemplo_e_admin());

drop policy if exists "cardapio_exemplo_combos_public_read" on public.cardapio_exemplo_combos;
create policy "cardapio_exemplo_combos_public_read" on public.cardapio_exemplo_combos
for select to anon, authenticated using (ativo);

drop policy if exists "cardapio_exemplo_combos_admin_all" on public.cardapio_exemplo_combos;
create policy "cardapio_exemplo_combos_admin_all" on public.cardapio_exemplo_combos
for all to authenticated using (public.cardapio_exemplo_e_admin()) with check (public.cardapio_exemplo_e_admin());

drop policy if exists "cardapio_exemplo_combo_itens_public_read" on public.cardapio_exemplo_combo_itens;
create policy "cardapio_exemplo_combo_itens_public_read" on public.cardapio_exemplo_combo_itens
for select to anon, authenticated using (
  exists (select 1 from public.cardapio_exemplo_combos c where c.id = combo_id and c.ativo)
);

drop policy if exists "cardapio_exemplo_combo_itens_admin_all" on public.cardapio_exemplo_combo_itens;
create policy "cardapio_exemplo_combo_itens_admin_all" on public.cardapio_exemplo_combo_itens
for all to authenticated using (public.cardapio_exemplo_e_admin()) with check (public.cardapio_exemplo_e_admin());

drop policy if exists "cardapio_exemplo_banners_public_read" on public.cardapio_exemplo_banners;
create policy "cardapio_exemplo_banners_public_read" on public.cardapio_exemplo_banners
for select to anon, authenticated using (ativo);

drop policy if exists "cardapio_exemplo_banners_admin_all" on public.cardapio_exemplo_banners;
create policy "cardapio_exemplo_banners_admin_all" on public.cardapio_exemplo_banners
for all to authenticated using (public.cardapio_exemplo_e_admin()) with check (public.cardapio_exemplo_e_admin());

drop policy if exists "cardapio_exemplo_cupons_admin_all" on public.cardapio_exemplo_cupons;
create policy "cardapio_exemplo_cupons_admin_all" on public.cardapio_exemplo_cupons
for all to authenticated using (public.cardapio_exemplo_e_admin()) with check (public.cardapio_exemplo_e_admin());

drop policy if exists "cardapio_exemplo_pedidos_admin_all" on public.cardapio_exemplo_pedidos;
create policy "cardapio_exemplo_pedidos_admin_all" on public.cardapio_exemplo_pedidos
for all to authenticated using (public.cardapio_exemplo_e_admin()) with check (public.cardapio_exemplo_e_admin());

drop policy if exists "cardapio_exemplo_itens_admin_all" on public.cardapio_exemplo_itens_pedido;
create policy "cardapio_exemplo_itens_admin_all" on public.cardapio_exemplo_itens_pedido
for all to authenticated using (public.cardapio_exemplo_e_admin()) with check (public.cardapio_exemplo_e_admin());

drop policy if exists "cardapio_exemplo_historico_admin_read" on public.cardapio_exemplo_historico_pedidos;
create policy "cardapio_exemplo_historico_admin_read" on public.cardapio_exemplo_historico_pedidos
for select to authenticated using (public.cardapio_exemplo_e_admin());

drop policy if exists "cardapio_exemplo_avaliacoes_public_read" on public.cardapio_exemplo_avaliacoes;
create policy "cardapio_exemplo_avaliacoes_public_read" on public.cardapio_exemplo_avaliacoes
for select to anon, authenticated using (aprovado);

drop policy if exists "cardapio_exemplo_avaliacoes_admin_all" on public.cardapio_exemplo_avaliacoes;
create policy "cardapio_exemplo_avaliacoes_admin_all" on public.cardapio_exemplo_avaliacoes
for all to authenticated using (public.cardapio_exemplo_e_admin()) with check (public.cardapio_exemplo_e_admin());

revoke all on table
  public.cardapio_exemplo_perfis,
  public.cardapio_exemplo_configuracoes,
  public.cardapio_exemplo_horarios,
  public.cardapio_exemplo_categorias,
  public.cardapio_exemplo_produtos,
  public.cardapio_exemplo_adicionais,
  public.cardapio_exemplo_combos,
  public.cardapio_exemplo_combo_itens,
  public.cardapio_exemplo_banners,
  public.cardapio_exemplo_cupons,
  public.cardapio_exemplo_pedidos,
  public.cardapio_exemplo_itens_pedido,
  public.cardapio_exemplo_historico_pedidos,
  public.cardapio_exemplo_avaliacoes
from anon, authenticated;

grant select on table
  public.cardapio_exemplo_configuracoes,
  public.cardapio_exemplo_horarios,
  public.cardapio_exemplo_categorias,
  public.cardapio_exemplo_produtos,
  public.cardapio_exemplo_adicionais,
  public.cardapio_exemplo_combos,
  public.cardapio_exemplo_combo_itens,
  public.cardapio_exemplo_banners,
  public.cardapio_exemplo_avaliacoes
to anon, authenticated;

grant select on table public.cardapio_exemplo_perfis to authenticated;
grant insert (id, nome) on table public.cardapio_exemplo_perfis to authenticated;
grant update (nome) on table public.cardapio_exemplo_perfis to authenticated;

grant insert, update, delete on table
  public.cardapio_exemplo_configuracoes,
  public.cardapio_exemplo_horarios,
  public.cardapio_exemplo_categorias,
  public.cardapio_exemplo_produtos,
  public.cardapio_exemplo_adicionais,
  public.cardapio_exemplo_combos,
  public.cardapio_exemplo_combo_itens,
  public.cardapio_exemplo_banners,
  public.cardapio_exemplo_cupons,
  public.cardapio_exemplo_pedidos,
  public.cardapio_exemplo_itens_pedido,
  public.cardapio_exemplo_avaliacoes
to authenticated;

grant select on table public.cardapio_exemplo_cupons to authenticated;
grant select on table public.cardapio_exemplo_pedidos to authenticated;
grant select on table public.cardapio_exemplo_itens_pedido to authenticated;
grant select on table public.cardapio_exemplo_historico_pedidos to authenticated;

grant all on table
  public.cardapio_exemplo_perfis,
  public.cardapio_exemplo_configuracoes,
  public.cardapio_exemplo_horarios,
  public.cardapio_exemplo_categorias,
  public.cardapio_exemplo_produtos,
  public.cardapio_exemplo_adicionais,
  public.cardapio_exemplo_combos,
  public.cardapio_exemplo_combo_itens,
  public.cardapio_exemplo_banners,
  public.cardapio_exemplo_cupons,
  public.cardapio_exemplo_pedidos,
  public.cardapio_exemplo_itens_pedido,
  public.cardapio_exemplo_historico_pedidos,
  public.cardapio_exemplo_avaliacoes
to service_role;

grant usage, select on sequence public.cardapio_exemplo_pedidos_numero_seq to authenticated, service_role;

insert into public.cardapio_exemplo_configuracoes (
  id, nome_estabelecimento, descricao, cidade, estado,
  cor_primaria, cor_secundaria, cor_destaque, cor_fundo, cor_texto, tipografia,
  aceita_delivery, aceita_retirada, status_abertura, aceitando_pedidos,
  mensagem_boas_vindas, rodape
) values (
  1, 'BOM PA POXA', 'Comida boa, feita com carinho.', null, null,
  '#B23A2A', '#F1E3CF', '#E8A33D', '#FAF5EC', '#2A1710', 'fraunces_figtree',
  true, true, 'automatico', true,
  'Bem-vindo! Monte seu pedido e acompanhe tudo pelo celular.',
  'BOM PA POXA • Cardápio digital'
) on conflict (id) do nothing;

insert into public.cardapio_exemplo_horarios (dia_semana, sequencia, fechado)
select d, 1, true from generate_series(0, 6) as d
on conflict (dia_semana, sequencia) do nothing;

insert into public.cardapio_exemplo_categorias (nome, descricao, ordem, ativo, destaque)
select * from (values
  ('Pratos', 'Pratos principais preparados na hora.', 0, true, false),
  ('Bebidas', 'Para acompanhar.', 1, true, false),
  ('Sobremesas', 'Para fechar com doçura.', 2, true, false)
) as v(nome, descricao, ordem, ativo, destaque)
where not exists (
  select 1 from public.cardapio_exemplo_categorias c where c.nome = v.nome
);

insert into public.cardapio_exemplo_banners (titulo, subtitulo, ordem, ativo)
select 'BOM PA POXA', 'Comida boa, feita com carinho.', 0, true
where not exists (select 1 from public.cardapio_exemplo_banners);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'cardapio-exemplo-imagens',
  'cardapio-exemplo-imagens',
  true,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do nothing;

drop policy if exists "cardapio_exemplo_imagens_public_read" on storage.objects;
create policy "cardapio_exemplo_imagens_public_read" on storage.objects
for select to anon, authenticated using (bucket_id = 'cardapio-exemplo-imagens');

drop policy if exists "cardapio_exemplo_imagens_admin_insert" on storage.objects;
create policy "cardapio_exemplo_imagens_admin_insert" on storage.objects
for insert to authenticated with check (
  bucket_id = 'cardapio-exemplo-imagens'
  and public.cardapio_exemplo_e_admin()
  and (storage.foldername(name))[1] in ('logo', 'banners', 'categorias', 'produtos', 'combos')
);

drop policy if exists "cardapio_exemplo_imagens_admin_update" on storage.objects;
create policy "cardapio_exemplo_imagens_admin_update" on storage.objects
for update to authenticated using (
  bucket_id = 'cardapio-exemplo-imagens'
  and public.cardapio_exemplo_e_admin()
  and (storage.foldername(name))[1] in ('logo', 'banners', 'categorias', 'produtos', 'combos')
) with check (
  bucket_id = 'cardapio-exemplo-imagens'
  and public.cardapio_exemplo_e_admin()
  and (storage.foldername(name))[1] in ('logo', 'banners', 'categorias', 'produtos', 'combos')
);

drop policy if exists "cardapio_exemplo_imagens_admin_delete" on storage.objects;
create policy "cardapio_exemplo_imagens_admin_delete" on storage.objects
for delete to authenticated using (
  bucket_id = 'cardapio-exemplo-imagens'
  and public.cardapio_exemplo_e_admin()
  and (storage.foldername(name))[1] in ('logo', 'banners', 'categorias', 'produtos', 'combos')
);

notify pgrst, 'reload schema';




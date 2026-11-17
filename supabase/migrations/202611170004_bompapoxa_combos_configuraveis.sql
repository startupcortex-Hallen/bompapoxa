-- Grupos e opções de escolha para combos configuráveis.
create table if not exists public.cardapio_exemplo_combo_grupos (
  id uuid primary key default gen_random_uuid(),
  combo_id uuid not null references public.cardapio_exemplo_combos(id) on delete cascade,
  nome text not null check (char_length(trim(nome)) between 1 and 120),
  min_qtd integer not null default 1 check (min_qtd >= 0),
  max_qtd integer not null default 1 check (max_qtd >= 1),
  obrigatorio boolean not null default true,
  ordem integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (max_qtd >= min_qtd),
  check (not obrigatorio or min_qtd >= 1)
);

create table if not exists public.cardapio_exemplo_combo_opcoes (
  id uuid primary key default gen_random_uuid(),
  grupo_id uuid not null references public.cardapio_exemplo_combo_grupos(id) on delete cascade,
  produto_id uuid not null references public.cardapio_exemplo_produtos(id) on delete restrict,
  quantidade integer not null default 1 check (quantidade > 0 and quantidade <= 50),
  rotulo text check (rotulo is null or char_length(rotulo) <= 120),
  ordem integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (grupo_id, produto_id, rotulo)
);

create index if not exists cardapio_exemplo_combo_grupos_combo_idx
  on public.cardapio_exemplo_combo_grupos (combo_id, ordem);
create index if not exists cardapio_exemplo_combo_opcoes_grupo_idx
  on public.cardapio_exemplo_combo_opcoes (grupo_id, ordem);
create index if not exists cardapio_exemplo_combo_opcoes_produto_idx
  on public.cardapio_exemplo_combo_opcoes (produto_id);

drop trigger if exists cardapio_exemplo_tg_combo_grupos_updated on public.cardapio_exemplo_combo_grupos;
create trigger cardapio_exemplo_tg_combo_grupos_updated
  before update on public.cardapio_exemplo_combo_grupos
  for each row execute function public.cardapio_exemplo_set_updated_at();

drop trigger if exists cardapio_exemplo_tg_combo_opcoes_updated on public.cardapio_exemplo_combo_opcoes;
create trigger cardapio_exemplo_tg_combo_opcoes_updated
  before update on public.cardapio_exemplo_combo_opcoes
  for each row execute function public.cardapio_exemplo_set_updated_at();

alter table public.cardapio_exemplo_combo_grupos enable row level security;
alter table public.cardapio_exemplo_combo_opcoes enable row level security;

drop policy if exists "cardapio_exemplo_combo_grupos_public_read" on public.cardapio_exemplo_combo_grupos;
create policy "cardapio_exemplo_combo_grupos_public_read" on public.cardapio_exemplo_combo_grupos
  for select to anon, authenticated using (
    exists (
      select 1 from public.cardapio_exemplo_combos c
      where c.id = combo_id and c.ativo
    )
  );

drop policy if exists "cardapio_exemplo_combo_grupos_admin_all" on public.cardapio_exemplo_combo_grupos;
create policy "cardapio_exemplo_combo_grupos_admin_all" on public.cardapio_exemplo_combo_grupos
  for all to authenticated
  using (public.cardapio_exemplo_e_admin())
  with check (public.cardapio_exemplo_e_admin());

drop policy if exists "cardapio_exemplo_combo_opcoes_public_read" on public.cardapio_exemplo_combo_opcoes;
create policy "cardapio_exemplo_combo_opcoes_public_read" on public.cardapio_exemplo_combo_opcoes
  for select to anon, authenticated using (
    exists (
      select 1
      from public.cardapio_exemplo_combo_grupos g
      join public.cardapio_exemplo_combos c on c.id = g.combo_id
      where g.id = grupo_id and c.ativo
    )
  );

drop policy if exists "cardapio_exemplo_combo_opcoes_admin_all" on public.cardapio_exemplo_combo_opcoes;
create policy "cardapio_exemplo_combo_opcoes_admin_all" on public.cardapio_exemplo_combo_opcoes
  for all to authenticated
  using (public.cardapio_exemplo_e_admin())
  with check (public.cardapio_exemplo_e_admin());

grant select on table public.cardapio_exemplo_combo_grupos, public.cardapio_exemplo_combo_opcoes
  to anon, authenticated;
grant insert, update, delete on table public.cardapio_exemplo_combo_grupos, public.cardapio_exemplo_combo_opcoes
  to authenticated;
grant all on table public.cardapio_exemplo_combo_grupos, public.cardapio_exemplo_combo_opcoes
  to service_role;

notify pgrst, 'reload schema';

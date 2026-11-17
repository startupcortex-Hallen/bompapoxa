-- BOM PA POXA — coordenadas do endereço de entrega
-- Evolução não destrutiva para pedidos existentes.

alter table public.cardapio_exemplo_pedidos
  add column if not exists latitude numeric(10,7);

alter table public.cardapio_exemplo_pedidos
  add column if not exists longitude numeric(10,7);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'cardapio_exemplo_pedidos_latitude_check'
      and conrelid = 'public.cardapio_exemplo_pedidos'::regclass
  ) then
    alter table public.cardapio_exemplo_pedidos
      add constraint cardapio_exemplo_pedidos_latitude_check
      check (latitude is null or latitude between -90 and 90);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'cardapio_exemplo_pedidos_longitude_check'
      and conrelid = 'public.cardapio_exemplo_pedidos'::regclass
  ) then
    alter table public.cardapio_exemplo_pedidos
      add constraint cardapio_exemplo_pedidos_longitude_check
      check (longitude is null or longitude between -180 and 180);
  end if;
end;
$$;

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
  v_latitude numeric;
  v_longitude numeric;
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
  v_latitude := nullif(trim(p_endereco->>'latitude'), '')::numeric;
  v_longitude := nullif(trim(p_endereco->>'longitude'), '')::numeric;
  if v_latitude is not null and (v_latitude < -90 or v_latitude > 90) then
    raise exception 'Latitude inválida.';
  end if;
  if v_longitude is not null and (v_longitude < -180 or v_longitude > 180) then
    raise exception 'Longitude inválida.';
  end if;
  v_obs := nullif(trim(p_observacoes), '');
  if v_obs is not null and char_length(v_obs) > 1000 then raise exception 'As observações são longas demais.'; end if;

  insert into public.cardapio_exemplo_pedidos (
    cliente_nome, cliente_telefone, cliente_email, modalidade,
    cep, endereco, numero_endereco, complemento, bairro, cidade, referencia,
    latitude, longitude, forma_pagamento, observacoes
  ) values (
    trim(p_cliente_nome), trim(p_cliente_telefone), nullif(trim(p_cliente_email), ''), p_modalidade,
    v_cep, v_endereco, v_numero_endereco, v_complemento, v_bairro, v_cidade, v_referencia,
    v_latitude, v_longitude, p_forma_pagamento, v_obs
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
    )
  )
  from public.cardapio_exemplo_pedidos o
  where o.id = p_pedido_id and o.tracking_token = p_token;
$$;

revoke all on function public.cardapio_exemplo_get_pedido(uuid, uuid) from public;
grant execute on function public.cardapio_exemplo_get_pedido(uuid, uuid) to anon, authenticated, service_role;

notify pgrst, 'reload schema';

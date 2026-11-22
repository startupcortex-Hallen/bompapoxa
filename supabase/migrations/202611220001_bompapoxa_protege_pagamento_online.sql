-- BOM PA POXA — protege pagamentos online contra alteração manual no painel.
-- O status financeiro de pedidos InfinitePay só pode ser alterado pelo backend
-- (service_role), nunca por um administrador autenticado no frontend.

create or replace function public.cardapio_exemplo_proteger_pagamento_online()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_role text := coalesce(auth.role(), '');
begin
  if v_role not in ('', 'service_role') then
    if new.status_pagamento is distinct from old.status_pagamento
       and (old.pagamento_provedor = 'infinitepay' or new.pagamento_provedor = 'infinitepay') then
      raise exception 'Pedidos com pagamento online sao confirmados automaticamente pela InfinitePay.'
        using errcode = '42501';
    end if;

    if new.pagamento_provedor = 'infinitepay'
       and new.pagamento_provedor is distinct from old.pagamento_provedor then
      raise exception 'A origem do pagamento online e definida automaticamente pela InfinitePay.'
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists cardapio_exemplo_tg_protege_pagamento_online on public.cardapio_exemplo_pedidos;
create trigger cardapio_exemplo_tg_protege_pagamento_online
  before update of status_pagamento, pagamento_provedor on public.cardapio_exemplo_pedidos
  for each row execute function public.cardapio_exemplo_proteger_pagamento_online();

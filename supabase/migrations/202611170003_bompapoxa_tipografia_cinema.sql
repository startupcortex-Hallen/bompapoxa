-- Permite a tipografia cinematográfica Bebas Neue + Figtree na configuração pública.
alter table public.cardapio_exemplo_configuracoes
  drop constraint if exists cardapio_exemplo_configuracoes_tipografia_check;

alter table public.cardapio_exemplo_configuracoes
  add constraint cardapio_exemplo_configuracoes_tipografia_check
  check (tipografia in ('fraunces_figtree', 'bricolage_figtree', 'playfair_dm', 'bebas_figtree'));

notify pgrst, 'reload schema';

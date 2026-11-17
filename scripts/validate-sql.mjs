import assert from "node:assert/strict";
import fs from "node:fs";
import { PGlite } from "@electric-sql/pglite";

const migration = fs.readFileSync("supabase/migrations/202611170001_bompapoxa.sql", "utf8");
const db = new PGlite();

const stubs = `
create role anon nologin;
create role authenticated nologin;
create role service_role nologin;

create schema auth;
create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  raw_user_meta_data jsonb default '{}'::jsonb
);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
create function auth.role() returns text language sql stable as $$
  select nullif(current_setting('request.jwt.claim.role', true), '')
$$;

create schema storage;
create table storage.buckets (
  id text primary key,
  name text not null,
  public boolean default false,
  file_size_limit bigint,
  allowed_mime_types text[]
);
create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text,
  name text,
  owner uuid
);
create function storage.foldername(name text) returns text[] language sql immutable as $$
  select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1]
$$;
grant usage on schema storage to anon, authenticated;
grant all on storage.objects to anon, authenticated;
grant execute on function storage.foldername(text) to anon, authenticated;
alter table storage.objects enable row level security;
`;

await db.exec(stubs);
await db.exec(migration);

const adminId = "11111111-1111-4111-8111-111111111111";
const clientId = "22222222-2222-4222-8222-222222222222";
const token = "2b0f0a0e-1111-4111-8111-111111111111";
const today = new Date().toISOString();

const tables = await db.query(`
  select table_name
  from information_schema.tables
  where table_schema = 'public' and table_name like 'cardapio_exemplo_%'
`);
assert.equal(tables.rows.length, 14, "devem existir 14 tabelas prefixadas");

const settings = await db.query("select nome_estabelecimento, status_abertura from public.cardapio_exemplo_configuracoes");
assert.equal(settings.rows[0].nome_estabelecimento, "BOM PA POXA");

const categorias = await db.query("select nome from public.cardapio_exemplo_categorias order by ordem");
assert.deepEqual(categorias.rows.map((row) => row.nome), ["Pratos", "Bebidas", "Sobremesas"]);

await db.exec(`
  insert into auth.users (id, email, raw_user_meta_data)
  values
    ('${adminId}', 'admin@bompapoxa.com', '{"full_name":"Admin"}'::jsonb),
    ('${clientId}', 'cliente@example.com', '{}'::jsonb);

  select public.cardapio_exemplo_promover_admin('admin@bompapoxa.com');

  insert into public.cardapio_exemplo_horarios (dia_semana, sequencia, fechado, abre, fecha)
  select dia, 1, false, '00:00', '23:59'
  from generate_series(0, 6) as dia
  on conflict (dia_semana, sequencia) do update
  set fechado = false, abre = '00:00', fecha = '23:59';
  update public.cardapio_exemplo_configuracoes set status_abertura = 'aberto';

  insert into public.cardapio_exemplo_produtos (categoria_id, nome, preco, ativo, disponivel)
  select id, 'Moqueca de peixe', 59.90, true, true
  from public.cardapio_exemplo_categorias where nome = 'Pratos';

  insert into public.cardapio_exemplo_adicionais (produto_id, nome, preco, grupo, min_qtd, max_qtd, disponivel)
  select id, 'Farofa extra', 3.50, 'Extras', 0, 3, true
  from public.cardapio_exemplo_produtos where nome = 'Moqueca de peixe';

  insert into public.cardapio_exemplo_combos (nome, preco, ativo, disponivel)
  values ('Combo da casa', 69.90, true, true);
  insert into public.cardapio_exemplo_combo_itens (combo_id, produto_id, quantidade)
  select c.id, p.id, 1
  from public.cardapio_exemplo_combos c, public.cardapio_exemplo_produtos p
  where c.nome = 'Combo da casa' and p.nome = 'Moqueca de peixe';

  insert into public.cardapio_exemplo_cupons (codigo, tipo, valor, pedido_minimo, ativo)
  values ('BEMVINDO10', 'percentual', 10, 30, true);
`);

const perfil = await db.query("select papel from public.cardapio_exemplo_perfis where id = $1", [adminId]);
assert.equal(perfil.rows[0].papel, "admin", "promoção de administrador deve funcionar");

const aberto = await db.query("select public.cardapio_exemplo_esta_aberto() as aberto");
assert.equal(aberto.rows[0].aberto, true);

const cupom = await db.query("select * from public.cardapio_exemplo_validar_cupom('BEMVINDO10', 100)");
assert.equal(cupom.rows[0].valido, true);
assert.equal(Number(cupom.rows[0].desconto), 10);

const produto = await db.query("select id from public.cardapio_exemplo_produtos where nome = 'Moqueca de peixe'");
const adicional = await db.query("select id from public.cardapio_exemplo_adicionais limit 1");
const itens = JSON.stringify([
  { produto_id: produto.rows[0].id, quantidade: 2, adicionais: [adicional.rows[0].id], observacao: "sem coentro" },
]);
const endereco = JSON.stringify({
  cep: "40000-000",
  endereco: "Rua da Bahia",
  numero: "10",
  bairro: "Centro",
  cidade: "Salvador",
  latitude: -12.9777,
  longitude: -38.5016,
});

const pedido = await db.query(
  `select * from public.cardapio_exemplo_place_order(
    'Cliente Teste', '(71) 99999-9999', 'cliente@example.com', 'delivery', $1::jsonb, $2::jsonb, 'pix', null, 'Teste', 'BEMVINDO10'
  )`,
  [endereco, itens],
);
const criado = pedido.rows[0];
assert.equal(criado.numero, 1001);
assert.equal(Number(criado.subtotal), 126.8);
assert.equal(Number(criado.desconto), 12.68);
assert.equal(Number(criado.total), 114.12);

const consulta = await db.query("select * from public.cardapio_exemplo_get_pedido($1, $2)", [criado.pedido_id, criado.tracking_token]);
const payload = typeof consulta.rows[0].cardapio_exemplo_get_pedido === "string"
  ? JSON.parse(consulta.rows[0].cardapio_exemplo_get_pedido)
  : consulta.rows[0].cardapio_exemplo_get_pedido;
assert.equal(payload.status, "novo");
assert.equal(payload.itens.length, 1);
assert.equal(payload.historico.length, 1);
assert.equal(Number(payload.endereco.latitude), -12.9777);
assert.equal(Number(payload.endereco.longitude), -38.5016);

await db.exec(`update public.cardapio_exemplo_pedidos set status = 'em_preparo' where id = '${criado.pedido_id}'`);
const consulta2 = await db.query("select * from public.cardapio_exemplo_get_pedido($1, $2)", [criado.pedido_id, criado.tracking_token]);
const payload2 = typeof consulta2.rows[0].cardapio_exemplo_get_pedido === "string"
  ? JSON.parse(consulta2.rows[0].cardapio_exemplo_get_pedido)
  : consulta2.rows[0].cardapio_exemplo_get_pedido;
assert.equal(payload2.historico.length, 2, "histórico deve registrar mudança de status");

async function as(role, sub, fn) {
  await db.exec("reset role");
  await db.exec(`set role ${role}`);
  await db.exec(`set request.jwt.claim.role = '${role}'`);
  await db.exec(`set request.jwt.claim.sub = ${sub ? `'${sub}'` : "''"}`);
  try {
    return await fn();
  } finally {
    await db.exec("reset role");
    await db.exec("reset request.jwt.claim.role");
    await db.exec("reset request.jwt.claim.sub");
  }
}

async function contar(tabela, role, sub) {
  return as(role, sub, async () => {
    try {
      const resposta = await db.query(`select count(*)::int as total from public.${tabela}`);
      return resposta.rows[0].total;
    } catch (erro) {
      return `negado:${erro.code}`;
    }
  });
}

const pedidoAnon = await as("anon", null, async () => {
  const resposta = await db.query(
    "select * from public.cardapio_exemplo_place_order('Cliente Anon', '(71) 98888-8888', null, 'retirada', null, $1::jsonb, 'pix', null, null, null)",
    [JSON.stringify([{ produto_id: produto.rows[0].id, quantidade: 1, adicionais: [adicional.rows[0].id] }])],
  );
  return resposta.rows[0];
});
assert.equal(pedidoAnon.numero, 1002, "pedido anônimo deve ser permitido");

await db.exec(`
  insert into public.cardapio_exemplo_avaliacoes (pedido_id, cliente_nome, nota, comentario, aprovado)
  values
    ('${criado.pedido_id}', 'Cliente', 5, 'Muito bom', true),
    ('${pedidoAnon.pedido_id}', 'Cliente', 4, 'Aguardando', false);
`);

assert.equal(await contar("cardapio_exemplo_configuracoes", "anon", null), 1);
assert.equal(await contar("cardapio_exemplo_categorias", "anon", null), 3);
assert.equal(await contar("cardapio_exemplo_produtos", "anon", null), 1);
assert.match(String(await contar("cardapio_exemplo_pedidos", "anon", null)), /^negado:/);
assert.match(String(await contar("cardapio_exemplo_cupons", "anon", null)), /^negado:/);
assert.equal(await contar("cardapio_exemplo_avaliacoes", "anon", null), 1);

async function inserirCategoria(role, sub) {
  return as(role, sub, async () => {
    try {
      await db.exec(`insert into public.cardapio_exemplo_categorias (nome) values ('Teste ${role} ${today}')`);
      return "permitido";
    } catch (erro) {
      return `negado:${erro.code}`;
    }
  });
}
assert.match(await inserirCategoria("anon", null), /^negado:/);
assert.match(await inserirCategoria("authenticated", clientId), /^negado:/);
assert.equal(await inserirCategoria("authenticated", adminId), "permitido");

const comboCriado = await as("authenticated", adminId, async () => {
  const resposta = await db.query(
    "select public.cardapio_exemplo_admin_salvar_combo($1::jsonb, $2::jsonb) as id",
    [
      JSON.stringify({ nome: "Combo teste", descricao: null, imagem_url: null, preco: 10, disponivel: true, destaque: false, ordem: 0, ativo: true }),
      JSON.stringify([{ produto_id: produto.rows[0].id, quantidade: 1 }]),
    ],
  );
  return resposta.rows[0].id;
});
assert.ok(comboCriado, "administrador deve salvar combo de forma atômica");

const comboCliente = await as("authenticated", clientId, async () => {
  try {
    await db.query(
      "select public.cardapio_exemplo_admin_salvar_combo($1::jsonb, $2::jsonb)",
      [JSON.stringify({ nome: "Combo cliente", preco: 10 }), JSON.stringify([{ produto_id: produto.rows[0].id, quantidade: 1 }])],
    );
    return "permitido";
  } catch (erro) {
    return `negado:${erro.code}`;
  }
});
assert.match(comboCliente, /^negado:/, "cliente não pode salvar combo");

const autopromocao = await as("authenticated", clientId, async () => {
  try {
    await db.exec("select public.cardapio_exemplo_promover_admin('cliente@example.com')");
    return "permitido";
  } catch (erro) {
    return `negado:${erro.code}`;
  }
});
assert.match(autopromocao, /^negado:/, "cliente não pode se promover");

const inserirPerfilAdmin = await as("authenticated", clientId, async () => {
  try {
    await db.exec(`insert into public.cardapio_exemplo_perfis (id, nome, papel) values ('${clientId}', 'Cliente', 'admin')`);
    return "permitido";
  } catch (erro) {
    return `negado:${erro.code}`;
  }
});
assert.match(inserirPerfilAdmin, /^negado:/, "cliente não pode inserir perfil admin");

const alterarPapel = await as("authenticated", clientId, async () => {
  try {
    await db.exec(`update public.cardapio_exemplo_perfis set papel = 'admin' where id = '${clientId}'`);
    return "permitido";
  } catch (erro) {
    return `negado:${erro.code}`;
  }
});
assert.match(alterarPapel, /^negado:/, "cliente não pode alterar o próprio papel");

async function upload(role, sub) {
  return as(role, sub, async () => {
    try {
      await db.exec(`insert into storage.objects (bucket_id, name) values ('cardapio-exemplo-imagens', 'produtos/teste.webp')`);
      return "permitido";
    } catch (erro) {
      return `negado:${erro.code}`;
    }
  });
}
assert.match(await upload("authenticated", clientId), /^negado:/);
assert.equal(await upload("authenticated", adminId), "permitido");

assert.equal(await contar("cardapio_exemplo_pedidos", "authenticated", clientId), 0);
assert.equal(await contar("cardapio_exemplo_pedidos", "authenticated", adminId), 2);

await db.close();
console.log("Validação SQL concluída: schema, pedidos, cupom, histórico e RLS aprovados.");

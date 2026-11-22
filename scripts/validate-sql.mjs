import assert from "node:assert/strict";
import fs from "node:fs";
import { PGlite } from "@electric-sql/pglite";

const migrations = [
  "supabase/migrations/202611170001_bompapoxa.sql",
  "supabase/migrations/202611170002_bompapoxa_endereco_mapa.sql",
  "supabase/migrations/202611170003_bompapoxa_tipografia_cinema.sql",
  "supabase/migrations/202611170004_bompapoxa_combos_configuraveis.sql",
  "supabase/migrations/202611180001_bompapoxa_pagamentos_impressao.sql",
  "supabase/migrations/202611190001_bompapoxa_infinitepay.sql",
];
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
for (const arquivo of migrations) {
  await db.exec(fs.readFileSync(arquivo, "utf8"));
}

const adminId = "11111111-1111-4111-8111-111111111111";
const clientId = "22222222-2222-4222-8222-222222222222";
const token = "2b0f0a0e-1111-4111-8111-111111111111";
const today = new Date().toISOString();

const tables = await db.query(`
  select table_name
  from information_schema.tables
  where table_schema = 'public' and table_name like 'cardapio_exemplo_%'
`);
assert.equal(tables.rows.length, 22, "devem existir 22 tabelas prefixadas");

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

// ---------------------------------------------------------------------------
// Pagamentos online e impressão
// ---------------------------------------------------------------------------

const filaInicial = await db.query(
  "select count(*)::int as total from public.cardapio_exemplo_fila_impressao where pedido_id = $1",
  [criado.pedido_id],
);
assert.equal(filaInicial.rows[0].total, 1, "pedido deve entrar automaticamente na fila de impressão");

const jobAutomatico = await db.query(
  "select id, job_key, status, payload from public.cardapio_exemplo_fila_impressao where pedido_id = $1",
  [criado.pedido_id],
);
assert.equal(jobAutomatico.rows[0].status, "pendente");
assert.match(jobAutomatico.rows[0].job_key, /^pedido:.*:principal$/);
assert.equal(jobAutomatico.rows[0].payload.itens.length, 1);
assert.equal(jobAutomatico.rows[0].payload.itens[0].adicionais[0].nome, "Farofa extra");

const pagamentoPublicoInicial = await as("anon", null, async () => {
  const resposta = await db.query("select public.cardapio_exemplo_pagamento_publico() as config");
  return resposta.rows[0].config;
});
assert.equal(pagamentoPublicoInicial.infinitepay_ativo, false);
assert.equal(pagamentoPublicoInicial.online_ativo, false);

const impressora = await as("authenticated", adminId, async () => {
  const resposta = await db.query(
    "select public.cardapio_exemplo_criar_impressora('Impressora teste', 80, 'principal') as dados",
  );
  return resposta.rows[0].dados;
});
assert.ok(impressora.token, "criação da impressora deve retornar token uma única vez");
assert.equal(impressora.largura_mm, 80);

const tokenInvalido = await as("anon", null, async () => {
  try {
    await db.query("select * from public.cardapio_exemplo_agente_claim_jobs('token-invalido', 5)");
    return "permitido";
  } catch (erro) {
    return `negado:${erro.code}`;
  }
});
assert.match(tokenInvalido, /^negado:/, "token inválido não pode retirar trabalhos");

const trabalhos = await as("anon", null, async () => {
  const resposta = await db.query("select * from public.cardapio_exemplo_agente_claim_jobs($1, 5)", [impressora.token]);
  return resposta.rows;
});
assert.ok(trabalhos.length >= 2, "agente deve retirar os trabalhos pendentes");
assert.equal(trabalhos[0].status, undefined);
assert.equal(trabalhos[0].largura_mm, 80);

const primeiroJob = trabalhos.find((job) => job.pedido_id === criado.pedido_id);
assert.ok(primeiroJob, "trabalho do pedido principal deve estar na fila");

await as("anon", null, async () => {
  await db.query(
    "select public.cardapio_exemplo_agente_concluir($1, $2, true, null)",
    [impressora.token, primeiroJob.id],
  );
});

const jobImpresso = await db.query(
  "select status, completed_at, tentativas from public.cardapio_exemplo_fila_impressao where id = $1",
  [primeiroJob.id],
);
assert.equal(jobImpresso.rows[0].status, "impresso");
assert.ok(jobImpresso.rows[0].completed_at);
assert.equal(jobImpresso.rows[0].tentativas, 1);

const reimpressao = await as("authenticated", adminId, async () => {
  const resposta = await db.query("select public.cardapio_exemplo_enfileirar_reimpressao($1) as id", [criado.pedido_id]);
  return resposta.rows[0].id;
});
assert.ok(reimpressao);
const jobReimpresso = await db.query(
  "select reimpressao, solicitado_por, status from public.cardapio_exemplo_fila_impressao where id = $1",
  [reimpressao],
);
assert.equal(jobReimpresso.rows[0].reimpressao, true);
assert.equal(jobReimpresso.rows[0].solicitado_por, adminId);
assert.equal(jobReimpresso.rows[0].status, "pendente");

const jobTeste = await as("authenticated", adminId, async () => {
  const resposta = await db.query("select public.cardapio_exemplo_enfileirar_teste($1) as id", [impressora.id]);
  return resposta.rows[0].id;
});
const jobTesteRow = await db.query(
  "select tipo, payload from public.cardapio_exemplo_fila_impressao where id = $1",
  [jobTeste],
);
assert.equal(jobTesteRow.rows[0].tipo, "teste");
assert.equal(jobTesteRow.rows[0].payload.teste, true);

const inserirFilaCliente = await as("authenticated", clientId, async () => {
  try {
    await db.exec(
      `insert into public.cardapio_exemplo_fila_impressao (job_key, payload) values ('cliente:${today}', '{}'::jsonb)`,
    );
    return "permitido";
  } catch (erro) {
    return `negado:${erro.code}`;
  }
});
assert.match(inserirFilaCliente, /^negado:/, "cliente não pode inserir trabalho de impressão arbitrário");

await db.exec(`
  insert into public.cardapio_exemplo_pagamentos
    (pedido_id, ambiente, tipo, status, status_gateway, metodo, valor, gateway_order_id,
     gateway_payment_id, gateway_checkout_id, gateway_external_reference, idempotency_key,
     checkout_url, receipt_url)
  values
    ('${criado.pedido_id}', 'producao', 'online', 'pendente', 'link_criado', 'checkout', 114.12,
     '${criado.pedido_id}', 'TX_TESTE_1', 'SLUG_TESTE_1', 'bompapoxa:${criado.pedido_id}',
     'idem-teste-1', 'https://checkout.infinitepay.com.br/shop?lenc=teste',
     'https://comprovante.example.com/teste');

  update public.cardapio_exemplo_pagamentos
  set status = 'aprovado', status_gateway = 'paid', tipo = 'pix', aprovado_em = now()
  where pedido_id = '${criado.pedido_id}';

  update public.cardapio_exemplo_pedidos
  set pagamento_provedor = 'infinitepay', pagamento_online_tipo = 'online'
  where id = '${criado.pedido_id}';

  update public.cardapio_exemplo_pedidos
  set pagamento_online_tipo = 'pix', status_pagamento = 'pago'
  where id = '${criado.pedido_id}';

  update public.cardapio_exemplo_pagamento_config
  set infinitepay_ativo = true
  where id = 1;
`);

const consultaPagamento = await db.query(
  "select * from public.cardapio_exemplo_get_pedido($1, $2)",
  [criado.pedido_id, criado.tracking_token],
);
const payloadPagamento = typeof consultaPagamento.rows[0].cardapio_exemplo_get_pedido === "string"
  ? JSON.parse(consultaPagamento.rows[0].cardapio_exemplo_get_pedido)
  : consultaPagamento.rows[0].cardapio_exemplo_get_pedido;
assert.equal(payloadPagamento.pagamento_provedor, "infinitepay");
assert.equal(payloadPagamento.pagamento_online_tipo, "pix");
assert.equal(payloadPagamento.pagamento.status, "aprovado");
assert.equal(payloadPagamento.pagamento.tipo, "pix");
assert.equal(payloadPagamento.pagamento.gateway_payment_id, "TX_TESTE_1");
assert.equal(payloadPagamento.pagamento.checkout_url, "https://checkout.infinitepay.com.br/shop?lenc=teste");

const pagamentoPublicoAtivo = await as("anon", null, async () => {
  const resposta = await db.query("select public.cardapio_exemplo_pagamento_publico() as config");
  return resposta.rows[0].config;
});
assert.equal(pagamentoPublicoAtivo.infinitepay_ativo, true);
assert.equal(pagamentoPublicoAtivo.online_ativo, true);

assert.match(
  String(await contar("cardapio_exemplo_pagamentos", "anon", null)),
  /^negado:/,
  "visitante não pode ler pagamentos",
);
assert.equal(await contar("cardapio_exemplo_pagamentos", "authenticated", adminId), 1);

const alterarPagamentoCliente = await as("authenticated", clientId, async () => {
  try {
    await db.exec(`update public.cardapio_exemplo_pagamentos set status = 'aprovado' where pedido_id = '${criado.pedido_id}'`);
    return "permitido";
  } catch (erro) {
    return `negado:${erro.code}`;
  }
});
assert.match(alterarPagamentoCliente, /^negado:/, "cliente não pode aprovar pagamento diretamente");

// ---------------------------------------------------------------------------
// Transição de um banco no formato antigo para o novo gateway
// ---------------------------------------------------------------------------

await db.exec(`
  alter table public.cardapio_exemplo_pagamento_config
    rename column infinitepay_ativo to mercadopago_ativo;
  alter table public.cardapio_exemplo_pagamento_config
    add column pix_online_ativo boolean not null default true;
  alter table public.cardapio_exemplo_pagamento_config
    add column cartao_online_ativo boolean not null default true;
  update public.cardapio_exemplo_pagamento_config
  set mercadopago_ativo = true, pix_online_ativo = true, cartao_online_ativo = true,
      ultimo_teste_ok = true
  where id = 1;

  alter table public.cardapio_exemplo_webhooks_processados
    rename column verificado to assinatura_valida;

  alter table public.cardapio_exemplo_pagamentos
    drop constraint if exists cardapio_exemplo_pagamentos_provedor_check;
  alter table public.cardapio_exemplo_pagamentos
    drop constraint if exists cardapio_exemplo_pagamentos_tipo_check;
  alter table public.cardapio_exemplo_pedidos
    drop constraint if exists cardapio_exemplo_pedidos_pagamento_provedor_check;
  alter table public.cardapio_exemplo_pedidos
    drop constraint if exists cardapio_exemplo_pedidos_pagamento_online_tipo_check;

  alter table public.cardapio_exemplo_pagamentos rename column status_gateway to status_mp;
  alter table public.cardapio_exemplo_pagamentos rename column gateway_order_id to mp_order_id;
  alter table public.cardapio_exemplo_pagamentos rename column gateway_payment_id to mp_payment_id;
  alter table public.cardapio_exemplo_pagamentos rename column gateway_checkout_id to mp_preference_id;
  alter table public.cardapio_exemplo_pagamentos rename column gateway_external_reference to mp_external_reference;
  alter table public.cardapio_exemplo_pagamentos rename column checkout_url to init_point;
  alter table public.cardapio_exemplo_pagamentos drop column if exists receipt_url;
  alter table public.cardapio_exemplo_pagamentos
    add column qr_code text,
    add column qr_code_base64 text,
    add column ticket_url text,
    add column sandbox_init_point text;

  update public.cardapio_exemplo_pagamentos
  set provedor = 'mercadopago', qr_code = '00020126580014br.gov.bcb.pix'
  where pedido_id = '${criado.pedido_id}';

  update public.cardapio_exemplo_pedidos
  set pagamento_provedor = 'mercadopago', pagamento_online_tipo = 'pix'
  where id = '${criado.pedido_id}';

  alter table public.cardapio_exemplo_pagamentos
    add constraint cardapio_exemplo_pagamentos_provedor_check check (provedor = 'mercadopago');
  alter table public.cardapio_exemplo_pagamentos
    add constraint cardapio_exemplo_pagamentos_tipo_check check (tipo in ('pix', 'cartao'));
  alter table public.cardapio_exemplo_pedidos
    add constraint cardapio_exemplo_pedidos_pagamento_provedor_check
    check (pagamento_provedor in ('manual', 'mercadopago'));
  alter table public.cardapio_exemplo_pedidos
    add constraint cardapio_exemplo_pedidos_pagamento_online_tipo_check
    check (pagamento_online_tipo is null or pagamento_online_tipo in ('pix', 'cartao'));

  insert into public.cardapio_exemplo_webhooks_processados
    (provedor, topico, evento_key, assinatura_valida, status, payload_resumo)
  values
    ('mercadopago', 'payment', 'legado|${criado.pedido_id}', true, 'processado', '{}'::jsonb);

  insert into public.cardapio_exemplo_pagamento_eventos
    (pagamento_id, pedido_id, origem, evento)
  select id, pedido_id, 'webhook', 'legado'
  from public.cardapio_exemplo_pagamentos
  where pedido_id = '${criado.pedido_id}';
`);

await db.exec(fs.readFileSync("supabase/migrations/202611190001_bompapoxa_infinitepay.sql", "utf8"));

const colunasPagamento = await db.query(`
  select column_name from information_schema.columns
  where table_schema = 'public' and table_name = 'cardapio_exemplo_pagamentos'
`);
const nomesColunas = colunasPagamento.rows.map((row) => row.column_name);
assert.ok(nomesColunas.includes("gateway_payment_id"), "transição deve criar gateway_payment_id");
assert.ok(nomesColunas.includes("checkout_url"), "transição deve criar checkout_url");
assert.ok(nomesColunas.includes("receipt_url"), "transição deve criar receipt_url");
assert.ok(!nomesColunas.includes("mp_payment_id"), "transição deve remover mp_payment_id");
assert.ok(!nomesColunas.includes("qr_code"), "transição deve remover qr_code");
assert.ok(!nomesColunas.includes("init_point"), "transição deve remover init_point");

const configTransicao = await db.query("select * from public.cardapio_exemplo_pagamento_config where id = 1");
assert.equal(configTransicao.rows[0].infinitepay_ativo, false, "transição deve exigir nova ativação");
assert.equal(configTransicao.rows[0].ultimo_teste_ok, false, "transição deve exigir novo teste");
assert.equal("mercadopago_ativo" in configTransicao.rows[0], false, "coluna antiga deve sair");

const webhooksRestantes = await db.query(
  "select count(*)::int as total from public.cardapio_exemplo_webhooks_processados where provedor = 'mercadopago'",
);
assert.equal(webhooksRestantes.rows[0].total, 0, "webhooks do provedor antigo devem ser removidos");

const colunasWebhook = await db.query(`
  select column_name from information_schema.columns
  where table_schema = 'public' and table_name = 'cardapio_exemplo_webhooks_processados'
`);
const nomesWebhook = colunasWebhook.rows.map((row) => row.column_name);
assert.ok(nomesWebhook.includes("verificado"), "transição deve criar verificado");
assert.ok(!nomesWebhook.includes("assinatura_valida"), "transição deve remover assinatura_valida");

const pagamentosRestantes = await db.query(
  "select count(*)::int as total from public.cardapio_exemplo_pagamentos where pedido_id = $1",
  [criado.pedido_id],
);
assert.equal(pagamentosRestantes.rows[0].total, 0, "tentativas do provedor antigo devem ser removidas");

const pedidoTransicao = await db.query(
  "select pagamento_provedor, pagamento_online_tipo, status_pagamento from public.cardapio_exemplo_pedidos where id = $1",
  [criado.pedido_id],
);
assert.equal(pedidoTransicao.rows[0].pagamento_provedor, "manual");
assert.equal(pedidoTransicao.rows[0].pagamento_online_tipo, null);
assert.equal(pedidoTransicao.rows[0].status_pagamento, "pago", "status financeiro do pedido deve ser preservado");

await db.close();
console.log("Validação SQL concluída: schema, pedidos, cupom, histórico, pagamentos, transição, impressão e RLS aprovados.");

-- ========================================================
-- PampaCota — esquema do banco de dados (Supabase / Postgres)
-- Execute este script inteiro no SQL Editor do Supabase
-- (menu lateral → SQL Editor → New query → cole tudo → Run)
-- ========================================================

-- ---------- TABELA: fornecedores ----------
create table if not exists fornecedores (
  uid uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  razao_social text not null,
  nome_fantasia text not null,
  cnpj text not null,
  telefone text not null,
  whatsapp text,
  cidade text not null,
  descricao text,
  logo_url text,
  servicos text[] not null default '{}',
  slug text unique not null,
  status text not null default 'pendente_verificacao', -- pendente_verificacao | verificado
  selos text[] not null default '{}', -- federal, estadual, trabalhista, municipal
  plano text not null default 'gratuito', -- gratuito | basico | premium
  criado_em timestamptz not null default now()
);

alter table fornecedores enable row level security;

-- qualquer um pode ler perfis de fornecedor (perfil público)
create policy "fornecedores_leitura_publica"
  on fornecedores for select
  using (true);

-- só o próprio usuário autenticado pode criar seu registro de fornecedor
create policy "fornecedores_insercao_propria"
  on fornecedores for insert
  with check (auth.uid() = uid);

-- só o próprio fornecedor pode atualizar seu registro
create policy "fornecedores_atualizacao_propria"
  on fornecedores for update
  using (auth.uid() = uid);


-- ---------- TABELA: cotacoes ----------
create table if not exists cotacoes (
  id uuid primary key default gen_random_uuid(),
  codigo_acesso text unique not null,
  itens jsonb not null default '[]', -- [{categoria, quantidade, regime}]
  horas_totais numeric not null default 0,
  pessoas_totais numeric not null default 0,
  cidade text not null,
  telefone text not null,
  descricao text,
  fotos text[] not null default '{}',
  fornecedores_interessados uuid[] not null default '{}',
  propostas jsonb not null default '[]', -- [{fornecedor_uid, valor, mensagem, criado_em}]
  fornecedor_escolhido_uid uuid references fornecedores(uid),
  status text not null default 'aberta', -- aberta | fechada_por_limite | fechada_escolhida
  criado_em timestamptz not null default now()
);

alter table cotacoes enable row level security;

-- qualquer um pode criar cotação (formulário público, sem login)
create policy "cotacoes_insercao_publica"
  on cotacoes for insert
  with check (true);

-- qualquer um pode ler cotações (acesso via link único / fornecedores logados)
create policy "cotacoes_leitura_publica"
  on cotacoes for select
  using (true);

-- qualquer um autenticado (fornecedor) pode atualizar (pegar cotação, propor)
-- a lógica de limite de 4 fornecedores é garantida por função no backend (abaixo)
create policy "cotacoes_atualizacao_autenticada"
  on cotacoes for update
  using (auth.role() = 'authenticated');


-- ---------- FUNÇÃO: pegar cotação com limite de 4 (atômica) ----------
-- Evita condição de corrida: usa lock de linha (FOR UPDATE) dentro da transação.
create or replace function pegar_cotacao(p_cotacao_id uuid, p_fornecedor_uid uuid)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_cotacao cotacoes;
  v_interessados uuid[];
  v_max int := 4;
begin
  select * into v_cotacao from cotacoes where id = p_cotacao_id for update;

  if v_cotacao is null then
    return jsonb_build_object('ok', false, 'motivo', 'nao_encontrada');
  end if;

  if v_cotacao.status != 'aberta' then
    return jsonb_build_object('ok', false, 'motivo', 'fechada');
  end if;

  if p_fornecedor_uid = any(v_cotacao.fornecedores_interessados) then
    return jsonb_build_object('ok', false, 'motivo', 'ja_pegou');
  end if;

  if array_length(v_cotacao.fornecedores_interessados, 1) >= v_max then
    return jsonb_build_object('ok', false, 'motivo', 'limite_atingido');
  end if;

  v_interessados := array_append(v_cotacao.fornecedores_interessados, p_fornecedor_uid);

  update cotacoes
  set fornecedores_interessados = v_interessados,
      status = case when array_length(v_interessados, 1) >= v_max
                    then 'fechada_por_limite' else 'aberta' end
  where id = p_cotacao_id;

  return jsonb_build_object('ok', true, 'vagas_restantes', v_max - array_length(v_interessados, 1));
end;
$$;


-- ---------- BUCKET DE STORAGE: fotos de cotações ----------
-- Execute também (caso o bucket não exista ainda):
insert into storage.buckets (id, name, public)
values ('cotacoes-fotos', 'cotacoes-fotos', true)
on conflict (id) do nothing;

create policy "cotacoes_fotos_leitura_publica"
  on storage.objects for select
  using (bucket_id = 'cotacoes-fotos');

create policy "cotacoes_fotos_upload_publico"
  on storage.objects for insert
  with check (bucket_id = 'cotacoes-fotos');


-- ---------- BUCKET DE STORAGE: logos de fornecedores ----------
insert into storage.buckets (id, name, public)
values ('fornecedores-logos', 'fornecedores-logos', true)
on conflict (id) do nothing;

create policy "fornecedores_logos_leitura_publica"
  on storage.objects for select
  using (bucket_id = 'fornecedores-logos');

-- só o próprio fornecedor autenticado pode subir/atualizar seu logo
-- (usa o uid do usuário logado como parte do caminho do arquivo)
create policy "fornecedores_logos_upload_proprio"
  on storage.objects for insert
  with check (
    bucket_id = 'fornecedores-logos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "fornecedores_logos_update_proprio"
  on storage.objects for update
  using (
    bucket_id = 'fornecedores-logos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );


-- ---------- TABELA: documentos_fornecedor ----------
-- Cada linha representa um documento enviado por um fornecedor.
-- O selo correspondente é exibido no perfil automaticamente quando existe um
-- registro aqui para aquele tipo de documento.
create table if not exists documentos_fornecedor (
  id uuid primary key default gen_random_uuid(),
  fornecedor_uid uuid not null references fornecedores(uid) on delete cascade,
  tipo text not null, -- federal | estadual | trabalhista | municipal | fgts | contrato_social
  caminho_arquivo text not null,
  enviado_em timestamptz not null default now(),
  unique (fornecedor_uid, tipo)
);

alter table documentos_fornecedor enable row level security;

-- só o próprio fornecedor pode ver a lista dos seus documentos enviados
create policy "documentos_leitura_propria"
  on documentos_fornecedor for select
  using (auth.uid() = fornecedor_uid);

create policy "documentos_insercao_propria"
  on documentos_fornecedor for insert
  with check (auth.uid() = fornecedor_uid);

create policy "documentos_atualizacao_propria"
  on documentos_fornecedor for update
  using (auth.uid() = fornecedor_uid);

create policy "documentos_delecao_propria"
  on documentos_fornecedor for delete
  using (auth.uid() = fornecedor_uid);


-- ---------- BUCKET DE STORAGE: documentos (PRIVADO) ----------
insert into storage.buckets (id, name, public)
values ('fornecedores-documentos', 'fornecedores-documentos', false)
on conflict (id) do nothing;

-- só o próprio fornecedor pode subir, ler ou substituir seus documentos
create policy "documentos_storage_leitura_propria"
  on storage.objects for select
  using (
    bucket_id = 'fornecedores-documentos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "documentos_storage_upload_propria"
  on storage.objects for insert
  with check (
    bucket_id = 'fornecedores-documentos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "documentos_storage_update_propria"
  on storage.objects for update
  using (
    bucket_id = 'fornecedores-documentos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

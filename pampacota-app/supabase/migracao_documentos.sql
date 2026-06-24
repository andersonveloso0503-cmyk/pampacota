-- ========================================================
-- PampaCota — Migração: documentos e selos do fornecedor
-- Execute no SQL Editor do Supabase
-- ========================================================

-- 1. tabela de documentos enviados pelo fornecedor
create table if not exists documentos_fornecedor (
  id uuid primary key default gen_random_uuid(),
  fornecedor_uid uuid not null references fornecedores(uid) on delete cascade,
  tipo text not null, -- federal | estadual | trabalhista | municipal | fgts | contrato_social
  caminho_arquivo text not null,
  enviado_em timestamptz not null default now(),
  unique (fornecedor_uid, tipo)
);

alter table documentos_fornecedor enable row level security;

drop policy if exists "documentos_leitura_propria" on documentos_fornecedor;
create policy "documentos_leitura_propria"
  on documentos_fornecedor for select
  using (auth.uid() = fornecedor_uid);

drop policy if exists "documentos_insercao_propria" on documentos_fornecedor;
create policy "documentos_insercao_propria"
  on documentos_fornecedor for insert
  with check (auth.uid() = fornecedor_uid);

drop policy if exists "documentos_atualizacao_propria" on documentos_fornecedor;
create policy "documentos_atualizacao_propria"
  on documentos_fornecedor for update
  using (auth.uid() = fornecedor_uid);

drop policy if exists "documentos_delecao_propria" on documentos_fornecedor;
create policy "documentos_delecao_propria"
  on documentos_fornecedor for delete
  using (auth.uid() = fornecedor_uid);

-- 2. bucket privado para os arquivos dos documentos
insert into storage.buckets (id, name, public)
values ('fornecedores-documentos', 'fornecedores-documentos', false)
on conflict (id) do nothing;

drop policy if exists "documentos_storage_leitura_propria" on storage.objects;
create policy "documentos_storage_leitura_propria"
  on storage.objects for select
  using (
    bucket_id = 'fornecedores-documentos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "documentos_storage_upload_propria" on storage.objects;
create policy "documentos_storage_upload_propria"
  on storage.objects for insert
  with check (
    bucket_id = 'fornecedores-documentos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "documentos_storage_update_propria" on storage.objects;
create policy "documentos_storage_update_propria"
  on storage.objects for update
  using (
    bucket_id = 'fornecedores-documentos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- 3. função que sincroniza o array "selos" da tabela fornecedores
--    sempre que um documento é inserido ou removido
create or replace function sincronizar_selos_fornecedor()
returns trigger
language plpgsql
security definer
as $$
begin
  update fornecedores
  set selos = (
    select coalesce(array_agg(distinct tipo), '{}')
    from documentos_fornecedor
    where fornecedor_uid = coalesce(new.fornecedor_uid, old.fornecedor_uid)
  )
  where uid = coalesce(new.fornecedor_uid, old.fornecedor_uid);
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_sincronizar_selos_insert on documentos_fornecedor;
create trigger trg_sincronizar_selos_insert
  after insert or update on documentos_fornecedor
  for each row execute function sincronizar_selos_fornecedor();

drop trigger if exists trg_sincronizar_selos_delete on documentos_fornecedor;
create trigger trg_sincronizar_selos_delete
  after delete on documentos_fornecedor
  for each row execute function sincronizar_selos_fornecedor();

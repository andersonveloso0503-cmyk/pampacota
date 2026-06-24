-- ========================================================
-- PampaCota — Migração: adicionar logo da empresa
-- Execute no SQL Editor do Supabase (sua tabela já existe,
-- este script só adiciona o que falta, sem apagar nada)
-- ========================================================

-- 1. adiciona a coluna de logo na tabela fornecedores (se ainda não existir)
alter table fornecedores add column if not exists logo_url text;

-- 2. cria o bucket de storage para os logos
insert into storage.buckets (id, name, public)
values ('fornecedores-logos', 'fornecedores-logos', true)
on conflict (id) do nothing;

-- 3. políticas de acesso ao bucket de logos
drop policy if exists "fornecedores_logos_leitura_publica" on storage.objects;
create policy "fornecedores_logos_leitura_publica"
  on storage.objects for select
  using (bucket_id = 'fornecedores-logos');

drop policy if exists "fornecedores_logos_upload_proprio" on storage.objects;
create policy "fornecedores_logos_upload_proprio"
  on storage.objects for insert
  with check (
    bucket_id = 'fornecedores-logos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "fornecedores_logos_update_proprio" on storage.objects;
create policy "fornecedores_logos_update_proprio"
  on storage.objects for update
  using (
    bucket_id = 'fornecedores-logos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

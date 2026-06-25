-- ========================================================
-- PampaCota — Migração: nome e endereço completo na cotação
-- Execute no SQL Editor do Supabase
-- ========================================================

alter table cotacoes add column if not exists nome text;
alter table cotacoes add column if not exists rua text;
alter table cotacoes add column if not exists numero text;
alter table cotacoes add column if not exists bairro text;

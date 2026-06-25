-- ========================================================
-- PampaCota — Migração: painel administrativo
-- ========================================================

-- 1. tabela de administradores (vincula um uid do Auth como admin)
create table if not exists admins (
  uid uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  criado_em timestamptz not null default now()
);

alter table admins enable row level security;

-- qualquer usuário autenticado pode checar SE ELE PRÓPRIO é admin
-- (necessário para o frontend decidir se mostra o painel)
create policy "admins_leitura_propria"
  on admins for select
  using (auth.uid() = uid);


-- 2. função auxiliar: verifica se o usuário autenticado atual é admin
create or replace function eh_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists(select 1 from admins where uid = auth.uid());
$$;


-- 3. políticas extras: admin pode fazer tudo em cotacoes e fornecedores
create policy "cotacoes_admin_tudo"
  on cotacoes for all
  using (eh_admin());

create policy "fornecedores_admin_tudo"
  on fornecedores for all
  using (eh_admin());


-- 4. depois de rodar esta migração, crie o usuário admin manualmente:
--    a) Vá em Authentication → Users → Add user (defina e-mail e senha)
--    b) Copie o UID gerado para esse usuário
--    c) Rode o comando abaixo substituindo os valores:
--
-- insert into admins (uid, email) values ('COLE_O_UID_AQUI', 'seu-email@exemplo.com');

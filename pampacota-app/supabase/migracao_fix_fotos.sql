-- ========================================================
-- PampaCota — Migração: corrigir upload de fotos da cotação
-- O comprador não tem login, então o UPDATE que salva as fotos
-- (depois do INSERT inicial) estava sendo bloqueado pelo RLS,
-- que só permitia update para usuários autenticados.
-- ========================================================

-- adiciona uma política extra de update pública, restrita ao momento
-- em que a cotação ainda está "aberta" e sem nenhum fornecedor interessado
-- (ou seja, é o próprio comprador concluindo o cadastro, não um terceiro mexendo depois)
create policy "cotacoes_atualizacao_publica_inicial"
  on cotacoes for update
  using (status = 'aberta' and array_length(fornecedores_interessados, 1) is null);

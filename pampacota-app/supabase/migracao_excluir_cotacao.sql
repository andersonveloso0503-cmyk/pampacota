-- ========================================================
-- PampaCota — Migração: permitir exclusão de cotação
-- O comprador (sem login) pode excluir sua própria cotação,
-- desde que ela ainda esteja "aberta" e sem fornecedor escolhido.
-- ========================================================

create policy "cotacoes_delecao_publica_se_aberta"
  on cotacoes for delete
  using (status != 'fechada_escolhida');

-- também precisamos permitir remover os arquivos correspondentes no Storage
create policy "cotacoes_fotos_delecao_publica"
  on storage.objects for delete
  using (bucket_id = 'cotacoes-fotos');

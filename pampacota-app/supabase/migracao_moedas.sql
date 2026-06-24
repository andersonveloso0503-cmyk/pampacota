-- ========================================================
-- PampaCota — Migração: Moedas RS, planos e pagamentos (Asaas)
-- Execute no SQL Editor do Supabase
-- ========================================================

-- 1. saldo de moedas e dados de plano na própria tabela fornecedores
alter table fornecedores add column if not exists saldo_moedas numeric not null default 0;
alter table fornecedores add column if not exists plano_ativo text; -- basico | premium | null (sem assinatura)
alter table fornecedores add column if not exists plano_renovacao_em timestamptz;
alter table fornecedores add column if not exists asaas_customer_id text; -- id do cliente no Asaas

-- 2. histórico de transações de moedas (créditos e débitos)
create table if not exists transacoes_moedas (
  id uuid primary key default gen_random_uuid(),
  fornecedor_uid uuid not null references fornecedores(uid) on delete cascade,
  tipo text not null, -- credito_assinatura | credito_pacote_avulso | debito_cotacao
  quantidade numeric not null, -- positivo para crédito, negativo para débito
  referencia text, -- ex: id da cotação, id do pagamento asaas
  criado_em timestamptz not null default now()
);

alter table transacoes_moedas enable row level security;

drop policy if exists "transacoes_leitura_propria" on transacoes_moedas;
create policy "transacoes_leitura_propria"
  on transacoes_moedas for select
  using (auth.uid() = fornecedor_uid);

-- inserções de transação só pelas funções serverless (service_role), não pelo cliente direto
drop policy if exists "transacoes_insercao_bloqueada" on transacoes_moedas;
create policy "transacoes_insercao_bloqueada"
  on transacoes_moedas for insert
  with check (false);

-- 3. registro de pagamentos (cobranças avulsas e assinaturas) vindos do Asaas
create table if not exists pagamentos (
  id uuid primary key default gen_random_uuid(),
  fornecedor_uid uuid not null references fornecedores(uid) on delete cascade,
  asaas_payment_id text unique,
  asaas_subscription_id text,
  tipo text not null, -- assinatura_basico | assinatura_premium | pacote_p | pacote_m | pacote_g
  valor numeric not null,
  status text not null default 'pendente', -- pendente | confirmado | cancelado
  criado_em timestamptz not null default now(),
  confirmado_em timestamptz
);

alter table pagamentos enable row level security;

drop policy if exists "pagamentos_leitura_propria" on pagamentos;
create policy "pagamentos_leitura_propria"
  on pagamentos for select
  using (auth.uid() = fornecedor_uid);

drop policy if exists "pagamentos_insercao_bloqueada" on pagamentos;
create policy "pagamentos_insercao_bloqueada"
  on pagamentos for insert
  with check (false);

-- 4. função atômica para debitar moedas ao pegar uma cotação
--    retorna {ok: true} ou {ok: false, motivo: 'saldo_insuficiente'}
create or replace function debitar_moedas_cotacao(p_fornecedor_uid uuid, p_quantidade numeric, p_cotacao_id uuid)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_saldo numeric;
begin
  select saldo_moedas into v_saldo from fornecedores where uid = p_fornecedor_uid for update;

  if v_saldo is null or v_saldo < p_quantidade then
    return jsonb_build_object('ok', false, 'motivo', 'saldo_insuficiente', 'saldo_atual', v_saldo);
  end if;

  update fornecedores set saldo_moedas = saldo_moedas - p_quantidade where uid = p_fornecedor_uid;

  insert into transacoes_moedas (fornecedor_uid, tipo, quantidade, referencia)
  values (p_fornecedor_uid, 'debito_cotacao', -p_quantidade, p_cotacao_id::text);

  return jsonb_build_object('ok', true, 'saldo_restante', v_saldo - p_quantidade);
end;
$$;

-- 5. atualiza pegar_cotacao para já checar/debitar moedas no mesmo passo atômico
create or replace function pegar_cotacao(p_cotacao_id uuid, p_fornecedor_uid uuid)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_cotacao cotacoes;
  v_interessados uuid[];
  v_max int := 4;
  v_custo numeric;
  v_saldo numeric;
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

  -- custo em Moedas RS = total de horas da cotação (1 hora = 1 moeda)
  v_custo := v_cotacao.horas_totais;

  select saldo_moedas into v_saldo from fornecedores where uid = p_fornecedor_uid for update;

  if v_saldo is null or v_saldo < v_custo then
    return jsonb_build_object('ok', false, 'motivo', 'saldo_insuficiente', 'custo', v_custo, 'saldo_atual', v_saldo);
  end if;

  v_interessados := array_append(v_cotacao.fornecedores_interessados, p_fornecedor_uid);

  update cotacoes
  set fornecedores_interessados = v_interessados,
      status = case when array_length(v_interessados, 1) >= v_max
                    then 'fechada_por_limite' else 'aberta' end
  where id = p_cotacao_id;

  update fornecedores set saldo_moedas = saldo_moedas - v_custo where uid = p_fornecedor_uid;

  insert into transacoes_moedas (fornecedor_uid, tipo, quantidade, referencia)
  values (p_fornecedor_uid, 'debito_cotacao', -v_custo, p_cotacao_id::text);

  return jsonb_build_object(
    'ok', true,
    'vagas_restantes', v_max - array_length(v_interessados, 1),
    'custo_pago', v_custo,
    'saldo_restante', v_saldo - v_custo
  );
end;
$$;

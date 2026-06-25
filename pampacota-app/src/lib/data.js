import { supabase } from "./supabase";

export const MAX_FORNECEDORES_POR_COTACAO = 4;

// ---------- AUTENTICAÇÃO ----------

export function watchAuthState(callback) {
  // dispara uma vez com o estado atual
  supabase.auth.getSession().then(({ data }) => {
    callback(data.session?.user || null);
  });

  const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user || null);
  });

  // retorna função de "unsubscribe", no mesmo formato que o Firebase usava
  return () => listener.subscription.unsubscribe();
}

export async function loginFornecedor(email, senha) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha });
  if (error) throw error;
  return data.user;
}

export async function logout() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// ---------- CADASTRO DE FORNECEDOR ----------

/**
 * dados esperado:
 * {
 *   razaoSocial, nomeFantasia, cnpj, telefone, whatsapp, email, senha,
 *   cidade, servicos: [], descricao
 * }
 */
export async function cadastrarFornecedor(dados) {
  const { email, senha, ...resto } = dados;

  // 1. cria o usuário no Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password: senha,
  });
  if (authError) throw authError;
  const uid = authData.user.id;

  // 2. slug a partir do nome fantasia
  const slug = slugify(resto.nomeFantasia || resto.razaoSocial || uid);

  // 3. salva o perfil na tabela fornecedores
  const fornecedorRow = {
    uid,
    email,
    razao_social: resto.razaoSocial,
    nome_fantasia: resto.nomeFantasia,
    cnpj: resto.cnpj,
    telefone: resto.telefone,
    whatsapp: resto.whatsapp || null,
    cidade: resto.cidade,
    descricao: resto.descricao || "",
    servicos: resto.servicos || [],
    slug,
    status: "pendente_verificacao",
    selos: [],
    plano: "gratuito",
  };

  const { error } = await supabase.from("fornecedores").insert(fornecedorRow);
  if (error) throw error;

  const { data, error: fetchError } = await supabase
    .from("fornecedores")
    .select("*")
    .eq("uid", uid)
    .single();
  if (fetchError) throw fetchError;

  return mapFornecedorFromDb(data);
}

export async function buscarFornecedorPorUid(uid) {
  if (!uid) return null;
  const { data, error } = await supabase.from("fornecedores").select("*").eq("uid", uid).maybeSingle();
  if (error) throw error;
  return data ? mapFornecedorFromDb(data) : null;
}

export async function buscarFornecedorPorSlug(slug) {
  const { data, error } = await supabase.from("fornecedores").select("*").eq("slug", slug).maybeSingle();
  if (error) throw error;
  return data ? mapFornecedorFromDb(data) : null;
}

export async function listarFornecedoresPorServico(servico) {
  const { data, error } = await supabase
    .from("fornecedores")
    .select("*")
    .contains("servicos", [servico]);
  if (error) throw error;
  return (data || []).map(mapFornecedorFromDb);
}

/**
 * Sobe (ou substitui) um documento do fornecedor logado e registra na tabela
 * documentos_fornecedor. O selo correspondente é sincronizado automaticamente
 * por um trigger no banco — não precisa atualizar a tabela fornecedores aqui.
 */
export async function enviarDocumentoFornecedor(uid, tipo, arquivo) {
  const extensao = arquivo.name.split(".").pop();
  const caminho = `${uid}/${tipo}.${extensao}`;

  const { error: uploadError } = await supabase.storage
    .from("fornecedores-documentos")
    .upload(caminho, arquivo, { cacheControl: "3600", upsert: true });
  if (uploadError) throw uploadError;

  const { error: upsertError } = await supabase
    .from("documentos_fornecedor")
    .upsert(
      { fornecedor_uid: uid, tipo, caminho_arquivo: caminho, enviado_em: new Date().toISOString() },
      { onConflict: "fornecedor_uid,tipo" }
    );
  if (upsertError) throw upsertError;
}

/**
 * Lista os documentos já enviados pelo fornecedor logado (só ele mesmo pode ver,
 * por política de RLS — os arquivos em si são privados).
 */
export async function listarDocumentosFornecedor(uid) {
  const { data, error } = await supabase
    .from("documentos_fornecedor")
    .select("tipo, enviado_em")
    .eq("fornecedor_uid", uid);
  if (error) throw error;
  return data || [];
}

/**
 * Sobe (ou substitui) o logo do fornecedor logado e atualiza o campo logo_url.
 * arquivo: File (imagem) vindo de um <input type="file">
 */
export async function atualizarLogoFornecedor(uid, arquivo) {
  const extensao = arquivo.name.split(".").pop();
  const caminho = `${uid}/logo.${extensao}`;

  const { error: uploadError } = await supabase.storage
    .from("fornecedores-logos")
    .upload(caminho, arquivo, { cacheControl: "3600", upsert: true });
  if (uploadError) throw uploadError;

  const { data: urlData } = supabase.storage.from("fornecedores-logos").getPublicUrl(caminho);
  // adiciona um parâmetro de versão pra evitar cache desatualizado do navegador
  const logoUrl = `${urlData.publicUrl}?v=${Date.now()}`;

  const { error: updateError } = await supabase
    .from("fornecedores")
    .update({ logo_url: logoUrl })
    .eq("uid", uid);
  if (updateError) throw updateError;

  return logoUrl;
}

// converte snake_case do banco para camelCase usado nos componentes
function mapFornecedorFromDb(row) {
  return {
    uid: row.uid,
    email: row.email,
    razaoSocial: row.razao_social,
    nomeFantasia: row.nome_fantasia,
    cnpj: row.cnpj,
    telefone: row.telefone,
    whatsapp: row.whatsapp,
    cidade: row.cidade,
    descricao: row.descricao,
    logoUrl: row.logo_url,
    servicos: row.servicos || [],
    slug: row.slug,
    status: row.status,
    selos: row.selos || [],
    plano: row.plano,
    saldoMoedas: row.saldo_moedas || 0,
    planoAtivo: row.plano_ativo,
    planoRenovacaoEm: row.plano_renovacao_em,
    criadoEm: row.criado_em,
  };
}

// ---------- COTAÇÕES (lado comprador) ----------

/**
 * dados esperado:
 * {
 *   itens: [{ categoria, quantidade, regime }],
 *   horasTotais, pessoasTotais,
 *   cidade, telefone, descricao,
 *   fotos: [File, File, ...]  (opcional, até 5 arquivos de imagem)
 * }
 */
export async function criarCotacao(dados) {
  const { fotos, itens, horasTotais, pessoasTotais, ...resto } = dados;
  const codigoAcesso = gerarCodigoAcesso();

  // 1. cria o registro da cotação primeiro (pra ter o id e subir fotos na pasta certa)
  const { error: insertError } = await supabase.from("cotacoes").insert({
    codigo_acesso: codigoAcesso,
    itens: itens || [],
    horas_totais: horasTotais || 0,
    pessoas_totais: pessoasTotais || 0,
    nome: resto.nome || "",
    cidade: resto.cidade,
    rua: resto.rua || "",
    numero: resto.numero || "",
    bairro: resto.bairro || "",
    telefone: resto.telefone,
    descricao: resto.descricao || "",
    fotos: [],
  });
  if (insertError) throw insertError;

  // 2. busca a linha recém-criada pelo código de acesso (chamada separada do insert,
  //    evita erro PGRST116 do PostgREST ao encadear select() logo após insert())
  const { data: inserida, error: fetchError } = await supabase
    .from("cotacoes")
    .select("*")
    .eq("codigo_acesso", codigoAcesso)
    .single();
  if (fetchError) throw fetchError;

  // 3. sobe as fotos (se houver) e atualiza o registro com as URLs
  const fotosUrls = await uploadFotosCotacao(inserida.id, fotos || []);
  if (fotosUrls.length > 0) {
    const { error: updateError } = await supabase
      .from("cotacoes")
      .update({ fotos: fotosUrls })
      .eq("id", inserida.id);
    if (updateError) throw updateError;
    return mapCotacaoFromDb({ ...inserida, fotos: fotosUrls });
  }

  return mapCotacaoFromDb(inserida);
}

async function uploadFotosCotacao(cotacaoId, fotos) {
  const limitadas = fotos.slice(0, 5);
  const urls = [];
  for (let i = 0; i < limitadas.length; i++) {
    const arquivo = limitadas[i];
    const extensao = (arquivo.name.split(".").pop() || "jpg").toLowerCase();
    const caminho = `${cotacaoId}/foto_${i}.${extensao}`;
    const { error } = await supabase.storage.from("cotacoes-fotos").upload(caminho, arquivo, {
      cacheControl: "3600",
      upsert: true,
      contentType: arquivo.type || "image/jpeg",
    });
    if (error) throw error;
    const { data } = supabase.storage.from("cotacoes-fotos").getPublicUrl(caminho);
    urls.push(data.publicUrl);
  }
  return urls;
}

export async function buscarCotacaoPorId(id) {
  const { data, error } = await supabase.from("cotacoes").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? mapCotacaoFromDb(data) : null;
}

/**
 * Busca a cotação pelo código de acesso único (usado no link enviado ao comprador,
 * já que o comprador não tem login).
 */
export async function buscarCotacaoPorCodigo(codigoAcesso) {
  const { data, error } = await supabase
    .from("cotacoes")
    .select("*")
    .eq("codigo_acesso", codigoAcesso)
    .maybeSingle();
  if (error) throw error;
  return data ? mapCotacaoFromDb(data) : null;
}

export async function listarCotacoesAbertas() {
  const { data, error } = await supabase.from("cotacoes").select("*").eq("status", "aberta");
  if (error) throw error;
  return (data || []).map(mapCotacaoFromDb);
}

/**
 * Um fornecedor "pega" (se interessa por) uma cotação.
 * Chama a função SQL pegar_cotacao, que usa lock de linha (FOR UPDATE)
 * para garantir atomicidade — nunca passa de MAX_FORNECEDORES_POR_COTACAO
 * mesmo se dois fornecedores clicarem ao mesmo tempo.
 */
export async function pegarCotacao(cotacaoId, fornecedorUid) {
  const { data, error } = await supabase.rpc("pegar_cotacao", {
    p_cotacao_id: cotacaoId,
    p_fornecedor_uid: fornecedorUid,
  });
  if (error) throw error;
  return {
    ok: data.ok,
    motivo: data.motivo,
    vagasRestantes: data.vagas_restantes,
    custoPago: data.custo_pago,
    saldoRestante: data.saldo_restante,
    custo: data.custo,
    saldoAtual: data.saldo_atual,
  };
}

/**
 * Inicia a cobrança de um plano (assinatura) ou pacote avulso de Moedas RS.
 * Chama a função serverless /api/criar-cobranca (que fala com o Asaas usando
 * a API Key protegida no backend) e retorna o link de pagamento (fatura).
 */
export async function criarCobranca(fornecedorUid, tipo) {
  const response = await fetch("/api/criar-cobranca", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fornecedorUid, tipo }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Erro ao criar cobrança.");
  return data;
}

export async function listarTransacoesMoedas(uid) {
  const { data, error } = await supabase
    .from("transacoes_moedas")
    .select("*")
    .eq("fornecedor_uid", uid)
    .order("criado_em", { ascending: false })
    .limit(20);
  if (error) throw error;
  return data || [];
}

/**
 * Fornecedor envia uma proposta formal para uma cotação que já pegou.
 */
export async function enviarProposta(cotacaoId, fornecedorUid, { valor, mensagem }) {
  const cotacao = await buscarCotacaoPorId(cotacaoId);
  if (!cotacao) return { ok: false, motivo: "nao_encontrada" };
  if (!cotacao.fornecedoresInteressados.includes(fornecedorUid)) {
    return { ok: false, motivo: "nao_pegou_essa_cotacao" };
  }

  const propostas = cotacao.propostas || [];
  const semProposta = propostas.filter((p) => p.fornecedorUid !== fornecedorUid);
  const novaProposta = {
    fornecedorUid,
    valor,
    mensagem,
    criadoEm: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("cotacoes")
    .update({ propostas: [...semProposta, novaProposta] })
    .eq("id", cotacaoId);
  if (error) throw error;
  return { ok: true };
}

/**
 * Comprador escolhe um fornecedor dentre os que enviaram proposta.
 */
export async function escolherFornecedor(cotacaoId, fornecedorUid) {
  const { error } = await supabase
    .from("cotacoes")
    .update({ fornecedor_escolhido_uid: fornecedorUid, status: "fechada_escolhida" })
    .eq("id", cotacaoId);
  if (error) throw error;
}

/**
 * Exclui a cotação e suas fotos associadas no Storage.
 * Usado pelo próprio comprador (via link único de acompanhamento) para
 * remover uma cotação que não quer mais manter ativa.
 */
export async function excluirCotacao(cotacaoId) {
  // 1. lista e remove os arquivos de foto dessa cotação no Storage
  const { data: arquivos } = await supabase.storage.from("cotacoes-fotos").list(cotacaoId);
  if (arquivos && arquivos.length > 0) {
    const caminhos = arquivos.map((a) => `${cotacaoId}/${a.name}`);
    await supabase.storage.from("cotacoes-fotos").remove(caminhos);
  }

  // 2. remove o registro da cotação no banco
  const { error } = await supabase.from("cotacoes").delete().eq("id", cotacaoId);
  if (error) throw error;
}

// ---------- ADMIN ----------

/**
 * Verifica se o usuário atualmente logado é administrador.
 * Retorna false (em vez de lançar erro) se não houver sessão ou não for admin.
 */
export async function verificarSeEhAdmin() {
  const { data: sessao } = await supabase.auth.getSession();
  const user = sessao.session?.user;
  if (!user) return false;

  const { data, error } = await supabase.from("admins").select("uid").eq("uid", user.id).maybeSingle();
  if (error) return false;
  return !!data;
}

export async function listarTodasCotacoesAdmin() {
  const { data, error } = await supabase
    .from("cotacoes")
    .select("*")
    .order("criado_em", { ascending: false });
  if (error) throw error;
  return (data || []).map(mapCotacaoFromDb);
}

export async function listarTodosFornecedoresAdmin() {
  const { data, error } = await supabase
    .from("fornecedores")
    .select("*")
    .order("criado_em", { ascending: false });
  if (error) throw error;
  return (data || []).map(mapFornecedorFromDb);
}

export async function adminExcluirCotacao(cotacaoId) {
  return excluirCotacao(cotacaoId);
}

export async function adminAtualizarStatusFornecedor(uid, status) {
  const { error } = await supabase.from("fornecedores").update({ status }).eq("uid", uid);
  if (error) throw error;
}

export async function adminAtualizarSelosFornecedor(uid, selos) {
  const { error } = await supabase.from("fornecedores").update({ selos }).eq("uid", uid);
  if (error) throw error;
}

function mapCotacaoFromDb(row) {
  return {
    id: row.id,
    codigoAcesso: row.codigo_acesso,
    itens: row.itens || [],
    horasTotais: row.horas_totais,
    pessoasTotais: row.pessoas_totais,
    nome: row.nome,
    cidade: row.cidade,
    rua: row.rua,
    numero: row.numero,
    bairro: row.bairro,
    telefone: row.telefone,
    descricao: row.descricao,
    fotos: row.fotos || [],
    fornecedoresInteressados: row.fornecedores_interessados || [],
    propostas: (row.propostas || []).map((p) => ({
      fornecedorUid: p.fornecedorUid ?? p.fornecedor_uid,
      valor: p.valor,
      mensagem: p.mensagem,
      criadoEm: p.criadoEm ?? p.criado_em,
    })),
    fornecedorEscolhidoUid: row.fornecedor_escolhido_uid,
    status: row.status,
    criadoEm: row.criado_em,
  };
}

// ---------- HELPERS ----------

export function slugify(text) {
  return text
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function validarCNPJ(cnpj) {
  const limpo = cnpj.replace(/[^\d]/g, "");
  return limpo.length === 14;
}

function gerarCodigoAcesso() {
  return Math.random().toString(36).slice(2, 10);
}

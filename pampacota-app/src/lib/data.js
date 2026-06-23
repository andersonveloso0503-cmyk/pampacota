import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import {
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
  runTransaction,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { auth, db, storage } from "./firebase";

export const MAX_FORNECEDORES_POR_COTACAO = 4;

// ---------- AUTENTICAÇÃO ----------

export function watchAuthState(callback) {
  return onAuthStateChanged(auth, callback);
}

export async function loginFornecedor(email, senha) {
  const cred = await signInWithEmailAndPassword(auth, email, senha);
  return cred.user;
}

export async function logout() {
  return signOut(auth);
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

  // 1. cria o usuário no Authentication
  const cred = await createUserWithEmailAndPassword(auth, email, senha);
  const uid = cred.user.uid;

  // 2. slug simples a partir do nome fantasia (usado na URL do perfil público)
  const slug = slugify(resto.nomeFantasia || resto.razaoSocial || uid);

  // 3. salva o perfil do fornecedor no Firestore
  const fornecedorDoc = {
    uid,
    email,
    ...resto,
    slug,
    status: "pendente_verificacao", // pendente_verificacao | verificado
    selos: [], // ex: ["federal", "estadual", "trabalhista", "municipal"]
    plano: "gratuito", // gratuito | premium
    criadoEm: serverTimestamp(),
  };

  await setDoc(doc(db, "fornecedores", uid), fornecedorDoc);

  return fornecedorDoc;
}

export async function buscarFornecedorPorUid(uid) {
  const snap = await getDoc(doc(db, "fornecedores", uid));
  return snap.exists() ? snap.data() : null;
}

export async function buscarFornecedorPorSlug(slug) {
  const q = query(collection(db, "fornecedores"), where("slug", "==", slug));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return snap.docs[0].data();
}

export async function listarFornecedoresPorServico(servico) {
  const q = query(
    collection(db, "fornecedores"),
    where("servicos", "array-contains", servico)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data());
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
  const { fotos, ...resto } = dados;
  const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const codigoAcesso = gerarCodigoAcesso();

  // 1. sobe as fotos do local (se houver) pro Storage
  const fotosUrls = await uploadFotosCotacao(id, fotos || []);

  // 2. salva o documento da cotação
  const cotacaoDoc = {
    id,
    codigoAcesso,
    ...resto,
    fotos: fotosUrls,
    fornecedoresInteressados: [], // uids dos fornecedores que "pegaram" essa cotação
    propostas: [], // { fornecedorUid, valor, mensagem, criadoEm }
    fornecedorEscolhidoUid: null,
    status: "aberta", // aberta | fechada_por_limite | fechada_escolhida
    criadoEm: serverTimestamp(),
  };
  await setDoc(doc(db, "cotacoes", id), cotacaoDoc);
  return cotacaoDoc;
}

async function uploadFotosCotacao(cotacaoId, fotos) {
  const limitadas = fotos.slice(0, 5);
  const urls = [];
  for (let i = 0; i < limitadas.length; i++) {
    const arquivo = limitadas[i];
    const caminho = `cotacoes/${cotacaoId}/foto_${i}_${arquivo.name}`;
    const storageRef = ref(storage, caminho);
    await uploadBytes(storageRef, arquivo);
    const url = await getDownloadURL(storageRef);
    urls.push(url);
  }
  return urls;
}

export async function buscarCotacaoPorId(id) {
  const snap = await getDoc(doc(db, "cotacoes", id));
  return snap.exists() ? snap.data() : null;
}

/**
 * Busca a cotação pelo código de acesso único (usado no link enviado ao comprador,
 * já que o comprador não tem login). Como não há índice direto por código,
 * fazemos a query pelo campo codigoAcesso.
 */
export async function buscarCotacaoPorCodigo(codigoAcesso) {
  const q = query(collection(db, "cotacoes"), where("codigoAcesso", "==", codigoAcesso));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return snap.docs[0].data();
}

export async function listarCotacoesAbertas() {
  const q = query(collection(db, "cotacoes"), where("status", "==", "aberta"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data());
}

/**
 * Um fornecedor "pega" (se interessa por) uma cotação.
 * Usa transação para garantir que nunca passe de MAX_FORNECEDORES_POR_COTACAO,
 * mesmo se dois fornecedores clicarem ao mesmo tempo.
 * Retorna { ok: true } ou { ok: false, motivo: "limite_atingido" | "ja_pegou" | "fechada" }
 */
export async function pegarCotacao(cotacaoId, fornecedorUid) {
  const cotacaoRef = doc(db, "cotacoes", cotacaoId);

  return runTransaction(db, async (transaction) => {
    const snap = await transaction.get(cotacaoRef);
    if (!snap.exists()) return { ok: false, motivo: "nao_encontrada" };

    const cotacao = snap.data();
    const interessados = cotacao.fornecedoresInteressados || [];

    if (cotacao.status !== "aberta") {
      return { ok: false, motivo: "fechada" };
    }
    if (interessados.includes(fornecedorUid)) {
      return { ok: false, motivo: "ja_pegou" };
    }
    if (interessados.length >= MAX_FORNECEDORES_POR_COTACAO) {
      return { ok: false, motivo: "limite_atingido" };
    }

    const novosInteressados = [...interessados, fornecedorUid];
    const novoStatus =
      novosInteressados.length >= MAX_FORNECEDORES_POR_COTACAO ? "fechada_por_limite" : "aberta";

    transaction.update(cotacaoRef, {
      fornecedoresInteressados: novosInteressados,
      status: novoStatus,
    });

    return { ok: true, vagasRestantes: MAX_FORNECEDORES_POR_COTACAO - novosInteressados.length };
  });
}

/**
 * Fornecedor envia uma proposta formal para uma cotação que já pegou.
 */
export async function enviarProposta(cotacaoId, fornecedorUid, { valor, mensagem }) {
  const cotacaoRef = doc(db, "cotacoes", cotacaoId);
  return runTransaction(db, async (transaction) => {
    const snap = await transaction.get(cotacaoRef);
    if (!snap.exists()) return { ok: false, motivo: "nao_encontrada" };
    const cotacao = snap.data();

    if (!(cotacao.fornecedoresInteressados || []).includes(fornecedorUid)) {
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

    transaction.update(cotacaoRef, { propostas: [...semProposta, novaProposta] });
    return { ok: true };
  });
}

/**
 * Comprador escolhe um fornecedor dentre os que enviaram proposta.
 */
export async function escolherFornecedor(cotacaoId, fornecedorUid) {
  const cotacaoRef = doc(db, "cotacoes", cotacaoId);
  await setDoc(
    cotacaoRef,
    { fornecedorEscolhidoUid: fornecedorUid, status: "fechada_escolhida" },
    { merge: true }
  );
}

function gerarCodigoAcesso() {
  return Math.random().toString(36).slice(2, 10);
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

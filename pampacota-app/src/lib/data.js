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
} from "firebase/firestore";
import { auth, db } from "./firebase";

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
 * { categoria, cidade, telefone, descricao }
 */
export async function criarCotacao(dados) {
  const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const cotacaoDoc = {
    id,
    ...dados,
    status: "aberta", // aberta | em_andamento | fechada
    criadoEm: serverTimestamp(),
  };
  await setDoc(doc(db, "cotacoes", id), cotacaoDoc);
  return cotacaoDoc;
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

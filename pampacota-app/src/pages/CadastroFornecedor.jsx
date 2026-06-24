import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { cadastrarFornecedor, validarCNPJ } from "../lib/data";

const SERVICOS_DISPONIVEIS = [
  { id: "Limpeza e conservação", icon: "🧹" },
  { id: "Portaria e recepção", icon: "🛎️" },
  { id: "Segurança", icon: "🛡️" },
  { id: "Zeladoria / manutenção predial", icon: "🔧" },
  { id: "Jardinagem", icon: "🌿" },
  { id: "Manutenção elétrica", icon: "⚡" },
];

const MAX_SERVICOS = 3;
const TOTAL_ETAPAS = 3;

export default function CadastroFornecedor({ onCadastroOk }) {
  const navigate = useNavigate();
  const [etapa, setEtapa] = useState(1);
  const [form, setForm] = useState({
    razaoSocial: "",
    nomeFantasia: "",
    cnpj: "",
    telefone: "",
    whatsapp: "",
    cidade: "",
    email: "",
    senha: "",
    confirmarSenha: "",
    descricao: "",
    servicos: [],
    aceitaTermos: false,
  });
  const [status, setStatus] = useState("idle");
  const [errorMsg, setErrorMsg] = useState("");

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function toggleServico(servico) {
    setForm((f) => {
      const jaTem = f.servicos.includes(servico);
      if (jaTem) return { ...f, servicos: f.servicos.filter((s) => s !== servico) };
      if (f.servicos.length >= MAX_SERVICOS) return f;
      return { ...f, servicos: [...f.servicos, servico] };
    });
  }

  function validarEtapa(n) {
    if (n === 1) {
      if (!form.razaoSocial.trim()) return "Informe a razão social da empresa.";
      if (!form.nomeFantasia.trim()) return "Informe o nome fantasia.";
      if (!validarCNPJ(form.cnpj)) return "CNPJ inválido. Digite os 14 números.";
      if (!form.cidade.trim()) return "Informe a cidade da empresa.";
      if (!form.telefone.trim()) return "Informe um telefone de contato.";
    }
    if (n === 2) {
      if (!form.email.trim()) return "Informe um e-mail.";
      if (form.senha.length < 6) return "A senha deve ter no mínimo 6 caracteres.";
      if (form.senha !== form.confirmarSenha) return "As senhas não coincidem.";
    }
    if (n === 3) {
      if (form.servicos.length === 0) return "Selecione pelo menos 1 serviço.";
      if (!form.aceitaTermos) return "É preciso aceitar os termos de uso.";
    }
    return null;
  }

  function irParaProxima() {
    const erro = validarEtapa(etapa);
    if (erro) {
      setStatus("error");
      setErrorMsg(erro);
      return;
    }
    setStatus("idle");
    setErrorMsg("");
    setEtapa((e) => Math.min(e + 1, TOTAL_ETAPAS));
  }

  function voltarEtapa() {
    setStatus("idle");
    setErrorMsg("");
    setEtapa((e) => Math.max(e - 1, 1));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const erro = validarEtapa(3);
    if (erro) {
      setStatus("error");
      setErrorMsg(erro);
      return;
    }
    setStatus("loading");
    try {
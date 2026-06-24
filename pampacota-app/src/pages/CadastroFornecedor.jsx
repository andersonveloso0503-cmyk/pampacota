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
      const { confirmarSenha, aceitaTermos, ...dados } = form;
      const fornecedor = await cadastrarFornecedor(dados);
      setStatus("ok");
      onCadastroOk?.(fornecedor);
      setTimeout(() => navigate(`/empresa/${fornecedor.slug}`), 900);
    } catch (err) {
      console.error(err);
      setStatus("error");
      if (err.message?.includes("already registered") || err.code === "auth/email-already-in-use") {
        setErrorMsg("Esse e-mail já está cadastrado. Tente entrar.");
      } else {
        setErrorMsg("Não foi possível concluir o cadastro. Tente novamente.");
      }
    }
  }

  const labelsEtapas = ["Sua empresa", "Acesso", "Serviços"];

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: 640 }}>
        <Link to="/" className="logo">
          <span className="dot"></span> PampaCota
        </Link>
        <h2>Cadastre sua empresa</h2>
        <p className="sub">
          Leva menos de 3 minutos. Depois disso, seu perfil já fica visível
          pra compradores da sua região.
        </p>

        <div className="cadastro-steps">
          {labelsEtapas.map((label, i) => {
            const numero = i + 1;
            const ativa = numero === etapa;
            const concluida = numero < etapa;
            return (
              <div key={label} className="cadastro-step">
                <div
                  className={`cadastro-step-circle ${ativa ? "ativa" : ""} ${concluida ? "concluida" : ""}`}
                >
                  {concluida ? "✓" : numero}
                </div>
                <span className={ativa ? "ativa" : ""}>{label}</span>
                {numero < TOTAL_ETAPAS && <div className="cadastro-step-linha" />}
              </div>
            );
          })}
        </div>

        {status === "ok" && (
          <div className="form-msg-ok">Cadastro realizado! Redirecionando para seu perfil...</div>
        )}
        {status === "error" && <div className="form-msg-error">{errorMsg}</div>}

        <form onSubmit={handleSubmit}>
          {etapa === 1 && (
            <>
              <div className="field-row">
                <div className="field">
                  <label>Razão social</label>
                  <input
                    type="text"
                    placeholder="Limpeza & Cia Serviços Ltda"
                    value={form.razaoSocial}
                    onChange={(e) => update("razaoSocial", e.target.value)}
                  />
                </div>
                <div className="field">
                  <label>Nome fantasia</label>
                  <input
                    type="text"
                    placeholder="Limpeza & Cia"
                    value={form.nomeFantasia}
                    onChange={(e) => update("nomeFantasia", e.target.value)}
                  />
                </div>
              </div>

              <div className="field-row">
                <div className="field">
                  <label>CNPJ</label>
                  <input
                    type="text"
                    placeholder="00.000.000/0000-00"
                    value={form.cnpj}
                    onChange={(e) => update("cnpj", e.target.value)}
                  />
                </div>
                <div className="field">
                  <label>Cidade</label>
                  <input
                    type="text"
                    placeholder="Porto Alegre"
                    value={form.cidade}
                    onChange={(e) => update("cidade", e.target.value)}
                  />
                </div>
              </div>

              <div className="field-row">
                <div className="field">
                  <label>Telefone</label>
                  <input
                    type="text"
                    placeholder="(51) 3000-0000"
                    value={form.telefone}
                    onChange={(e) => update("telefone", e.target.value)}
                  />
                </div>
                <div className="field">
                  <label>WhatsApp (opcional)</label>
                  <input
                    type="text"
                    placeholder="(51) 9...."
                    value={form.whatsapp}
                    onChange={(e) => update("whatsapp", e.target.value)}
                  />
                </div>
              </div>

              <button type="button" className="btn btn-primary btn-lg" style={{ width: "100%", marginTop: 10 }} onClick={irParaProxima}>
                Continuar →
              </button>
            </>
          )}

          {etapa === 2 && (
            <>
              <div className="field">
                <label>E-mail de acesso</label>
                <input
                  type="email"
                  placeholder="contato@suaempresa.com.br"
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                />
              </div>

              <div className="field-row">
                <div className="field">
                  <label>Senha</label>
                  <input
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={form.senha}
                    onChange={(e) => update("senha", e.target.value)}
                  />
                </div>
                <div className="field">
                  <label>Confirmar senha</label>
                  <input
                    type="password"
                    placeholder="Repita a senha"
                    value={form.confirmarSenha}
                    onChange={(e) => update("confirmarSenha", e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={voltarEtapa}>
                  ← Voltar
                </button>
                <button type="button" className="btn btn-primary" style={{ flex: 2 }} onClick={irParaProxima}>
                  Continuar →
                </button>
              </div>
            </>
          )}

          {etapa === 3 && (
            <>
              <div className="field">
                <label>Serviços oferecidos (até {MAX_SERVICOS})</label>
                <div className="servicos-grid">
                  {SERVICOS_DISPONIVEIS.map(({ id: s, icon }) => {
                    const active = form.servicos.includes(s);
                    return (
                      <div
                        key={s}
                        className={`servico-pill ${active ? "active" : ""}`}
                        onClick={() => toggleServico(s)}
                      >
                        <span>{icon}</span> {s}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="field">
                <label>Descrição da empresa</label>
                <textarea
                  rows={3}
                  placeholder="Conte rapidamente sua experiência e diferenciais..."
                  value={form.descricao}
                  onChange={(e) => update("descricao", e.target.value)}
                />
              </div>

              <div className="checkbox-row">
                <input
                  type="checkbox"
                  checked={form.aceitaTermos}
                  onChange={(e) => update("aceitaTermos", e.target.checked)}
                />
                <label>
                  Declaro que as informações são verdadeiras e aceito os termos de uso da PampaCota.
                </label>
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={voltarEtapa}>
                  ← Voltar
                </button>
                <button className="btn btn-primary" style={{ flex: 2 }} disabled={status === "loading"}>
                  {status === "loading" ? "Cadastrando..." : "Cadastrar minha empresa →"}
                </button>
              </div>
            </>
          )}
        </form>

        <p className="auth-switch">
          Já tem cadastro? <Link to="/entrar">Entrar</Link>
        </p>
      </div>
    </div>
  );
}

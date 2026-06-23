import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loginFornecedor, buscarFornecedorPorUid } from "../lib/data";

export default function Login({ onLoginOk }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [status, setStatus] = useState("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim() || !senha.trim()) {
      setStatus("error");
      setErrorMsg("Preencha e-mail e senha.");
      return;
    }
    setStatus("loading");
    try {
      const user = await loginFornecedor(email, senha);
      const fornecedor = await buscarFornecedorPorUid(user.uid);
      onLoginOk?.(fornecedor);
      if (fornecedor?.slug) {
        navigate(`/empresa/${fornecedor.slug}`);
      } else {
        navigate("/");
      }
    } catch (err) {
      console.error(err);
      setStatus("error");
      if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password" || err.code === "auth/user-not-found") {
        setErrorMsg("E-mail ou senha incorretos.");
      } else {
        setErrorMsg("Não foi possível entrar agora. Tente novamente.");
      }
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <Link to="/" className="logo">
          <span className="dot"></span> PampaCota
        </Link>
        <h2>Entrar na sua conta</h2>
        <p className="sub">Acesse seu perfil de fornecedor e seus leads.</p>

        {status === "error" && <div className="form-msg-error">{errorMsg}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>E-mail</label>
            <input
              type="email"
              placeholder="contato@suaempresa.com.br"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Senha</label>
            <input
              type="password"
              placeholder="Sua senha"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />
          </div>
          <button className="btn btn-primary btn-lg" style={{ width: "100%", marginTop: 10 }} disabled={status === "loading"}>
            {status === "loading" ? "Entrando..." : "Entrar →"}
          </button>
        </form>

        <p className="auth-switch">
          Ainda não tem conta? <Link to="/cadastro-fornecedor">Cadastre sua empresa</Link>
        </p>
      </div>
    </div>
  );
}

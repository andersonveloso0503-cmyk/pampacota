import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { verificarSeEhAdmin } from "../lib/data";

export default function LoginAdmin({ onLoginOk }) {
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
      const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
      if (error) throw error;

      const ehAdmin = await verificarSeEhAdmin();
      if (!ehAdmin) {
        await supabase.auth.signOut();
        setStatus("error");
        setErrorMsg("Esta conta não tem acesso administrativo.");
        return;
      }

      onLoginOk?.(true);
      navigate("/admin");
    } catch (err) {
      console.error(err);
      setStatus("error");
      setErrorMsg("E-mail ou senha incorretos.");
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <Link to="/" className="logo">
          <span className="dot"></span> PampaCota
        </Link>
        <h2>Acesso administrativo</h2>
        <p className="sub">Área restrita para gestão da plataforma.</p>

        {status === "error" && <div className="form-msg-error">{errorMsg}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>E-mail</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="field">
            <label>Senha</label>
            <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} />
          </div>
          <button className="btn btn-primary btn-lg" style={{ width: "100%", marginTop: 10 }} disabled={status === "loading"}>
            {status === "loading" ? "Entrando..." : "Entrar →"}
          </button>
        </form>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import CadastroFornecedor from "./pages/CadastroFornecedor";
import Login from "./pages/Login";
import PerfilFornecedor from "./pages/PerfilFornecedor";
import AcompanharCotacao from "./pages/AcompanharCotacao";
import PainelFornecedor from "./pages/PainelFornecedor";
import Planos from "./pages/Planos";
import LoginAdmin from "./pages/LoginAdmin";
import PainelAdmin from "./pages/PainelAdmin";
import { watchAuthState, buscarFornecedorPorUid, verificarSeEhAdmin, logout } from "./lib/data";
import "./styles/global.css";

export default function App() {
  const [fornecedor, setFornecedor] = useState(null);
  const [ehAdmin, setEhAdmin] = useState(false);
  const [carregandoAuth, setCarregandoAuth] = useState(true);

  useEffect(() => {
    const unsubscribe = watchAuthState(async (user) => {
      if (user) {
        const [dados, admin] = await Promise.all([
          buscarFornecedorPorUid(user.id).catch(() => null),
          verificarSeEhAdmin().catch(() => false),
        ]);
        setFornecedor(dados);
        setEhAdmin(admin);
      } else {
        setFornecedor(null);
        setEhAdmin(false);
      }
      setCarregandoAuth(false);
    });
    return unsubscribe;
  }, []);

  async function handleLogout() {
    await logout();
    setFornecedor(null);
    setEhAdmin(false);
  }

  return (
    <BrowserRouter>
      <Header fornecedor={fornecedor} onLogout={handleLogout} />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route
          path="/cadastro-fornecedor"
          element={<CadastroFornecedor onCadastroOk={setFornecedor} />}
        />
        <Route path="/entrar" element={<Login onLoginOk={setFornecedor} />} />
        <Route
          path="/empresa/:slug"
          element={<PerfilFornecedor fornecedorLogado={fornecedor} />}
        />
        <Route path="/cotacao/:codigo" element={<AcompanharCotacao />} />
        <Route
          path="/painel"
          element={
            <PainelFornecedor fornecedorLogado={fornecedor} carregandoAuth={carregandoAuth} />
          }
        />
        <Route
          path="/planos"
          element={<Planos fornecedorLogado={fornecedor} carregandoAuth={carregandoAuth} />}
        />
        <Route path="/admin/entrar" element={<LoginAdmin onLoginOk={setEhAdmin} />} />
        <Route
          path="/admin"
          element={<PainelAdmin ehAdmin={ehAdmin} carregandoAuth={carregandoAuth} />}
        />
      </Routes>
      <Footer />
    </BrowserRouter>
  );
}

import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import CadastroFornecedor from "./pages/CadastroFornecedor";
import Login from "./pages/Login";
import PerfilFornecedor from "./pages/PerfilFornecedor";
import AcompanharCotacao from "./pages/AcompanharCotacao";
import { watchAuthState, buscarFornecedorPorUid, logout } from "./lib/data";
import "./styles/global.css";

export default function App() {
  const [fornecedor, setFornecedor] = useState(null);

  useEffect(() => {
    const unsubscribe = watchAuthState(async (user) => {
      if (user) {
        const dados = await buscarFornecedorPorUid(user.uid).catch(() => null);
        setFornecedor(dados);
      } else {
        setFornecedor(null);
      }
    });
    return unsubscribe;
  }, []);

  async function handleLogout() {
    await logout();
    setFornecedor(null);
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
        <Route path="/empresa/:slug" element={<PerfilFornecedor />} />
        <Route path="/cotacao/:codigo" element={<AcompanharCotacao />} />
      </Routes>
      <Footer />
    </BrowserRouter>
  );
}

import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import {
  listarTodasCotacoesAdmin,
  listarTodosFornecedoresAdmin,
  adminExcluirCotacao,
  adminAtualizarStatusFornecedor,
  adminAtualizarSelosFornecedor,
} from "../lib/data";
import { getCategoria } from "../lib/catalogo";

export default function PainelAdmin({ ehAdmin, carregandoAuth }) {
  const [aba, setAba] = useState("cotacoes"); // cotacoes | fornecedores
  const [cotacoes, setCotacoes] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (ehAdmin) carregar();
  }, [ehAdmin]);

  function carregar() {
    setCarregando(true);
    Promise.all([listarTodasCotacoesAdmin(), listarTodosFornecedoresAdmin()])
      .then(([c, f]) => {
        setCotacoes(c);
        setFornecedores(f);
      })
      .catch((err) => console.error(err))
      .finally(() => setCarregando(false));
  }

  async function handleExcluirCotacao(cotacao) {
    if (!confirm(`Excluir a cotação de ${cotacao.cidade}? Essa ação não pode ser desfeita.`)) return;
    try {
      await adminExcluirCotacao(cotacao.id);
      carregar();
    } catch (err) {
      console.error(err);
      alert("Não foi possível excluir.");
    }
  }

  async function handleAlternarVerificacao(fornecedor) {
    const novoStatus = fornecedor.status === "verificado" ? "pendente_verificacao" : "verificado";
    try {
      await adminAtualizarStatusFornecedor(fornecedor.uid, novoStatus);
      carregar();
    } catch (err) {
      console.error(err);
      alert("Não foi possível atualizar.");
    }
  }

  async function handleAlternarBan(fornecedor) {
    const banido = fornecedor.status === "banido";
    const novoStatus = banido ? "pendente_verificacao" : "banido";
    if (!banido && !confirm(`Banir ${fornecedor.nomeFantasia}? O perfil ficará inacessível.`)) return;
    try {
      await adminAtualizarStatusFornecedor(fornecedor.uid, novoStatus);
      carregar();
    } catch (err) {
      console.error(err);
      alert("Não foi possível atualizar.");
    }
  }

  if (carregandoAuth) {
    return (
      <div className="wrap" style={{ padding: "100px 28px", textAlign: "center" }}>
        Carregando...
      </div>
    );
  }

  if (!ehAdmin) {
    return <Navigate to="/admin/entrar" replace />;
  }

  return (
    <section style={{ padding: "40px 0" }}>
      <div className="wrap" style={{ maxWidth: 1100 }}>
        <span className="mono" style={{ color: "var(--gold)" }}>
          Administração
        </span>
        <h1 style={{ fontSize: "1.7rem", color: "var(--green-deep)", margin: "4px 0 24px" }}>
          Painel PampaCota
        </h1>

        <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
          <button
            className={aba === "cotacoes" ? "btn btn-primary" : "btn btn-ghost"}
            onClick={() => setAba("cotacoes")}
          >
            Cotações ({cotacoes.length})
          </button>
          <button
            className={aba === "fornecedores" ? "btn btn-primary" : "btn btn-ghost"}
            onClick={() => setAba("fornecedores")}
          >
            Fornecedores ({fornecedores.length})
          </button>
        </div>

        {carregando && <p style={{ color: "var(--ink-soft)" }}>Carregando...</p>}

        {!carregando && aba === "cotacoes" && (
          <div className="admin-tabela">
            {cotacoes.map((c) => (
              <div key={c.id} className="admin-linha">
                <div className="admin-linha-info">
                  <strong>{c.cidade}</strong>
                  <span className="mono" style={{ color: "var(--ink-soft)" }}>
                    {c.codigoAcesso} · {c.status}
                  </span>
                  <div style={{ fontSize: "0.82rem", color: "var(--ink-soft)" }}>
                    {(c.itens || []).map((item, i) => (
                      <span key={i}>
                        {getCategoria(item.categoria).label} ({item.quantidade}x)
                        {i < c.itens.length - 1 ? ", " : ""}
                      </span>
                    ))}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <a href={`/cotacao/${c.codigoAcesso}`} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">
                    Ver
                  </a>
                  <button className="btn btn-ghost btn-sm" style={{ color: "var(--red)" }} onClick={() => handleExcluirCotacao(c)}>
                    Excluir
                  </button>
                </div>
              </div>
            ))}
            {cotacoes.length === 0 && <p style={{ color: "var(--ink-soft)" }}>Nenhuma cotação cadastrada.</p>}
          </div>
        )}

        {!carregando && aba === "fornecedores" && (
          <div className="admin-tabela">
            {fornecedores.map((f) => (
              <div key={f.uid} className="admin-linha">
                <div className="admin-linha-info">
                  <strong>{f.nomeFantasia || f.razaoSocial}</strong>
                  <span className="mono" style={{ color: "var(--ink-soft)" }}>
                    {f.cidade} · {f.email}
                  </span>
                  <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                    {f.status === "verificado" && <span className="badge badge-verificado">Verificado</span>}
                    {f.status === "pendente_verificacao" && <span className="badge badge-pendente">Pendente</span>}
                    {f.status === "banido" && (
                      <span className="badge" style={{ background: "#F6E9E9", color: "var(--red)" }}>
                        Banido
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <a href={`/empresa/${f.slug}`} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">
                    Ver perfil
                  </a>
                  <button className="btn btn-ghost btn-sm" onClick={() => handleAlternarVerificacao(f)}>
                    {f.status === "verificado" ? "Remover verificação" : "Verificar"}
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ color: "var(--red)" }}
                    onClick={() => handleAlternarBan(f)}
                  >
                    {f.status === "banido" ? "Desbanir" : "Banir"}
                  </button>
                </div>
              </div>
            ))}
            {fornecedores.length === 0 && <p style={{ color: "var(--ink-soft)" }}>Nenhum fornecedor cadastrado.</p>}
          </div>
        )}
      </div>
    </section>
  );
}

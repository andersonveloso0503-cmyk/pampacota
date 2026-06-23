import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { buscarFornecedorPorSlug } from "../lib/data";

const SELO_LABELS = {
  federal: "Selo Federal",
  estadual: "Selo Estadual",
  trabalhista: "Selo Trabalhista",
  municipal: "Selo Municipal",
};

export default function PerfilFornecedor() {
  const { slug } = useParams();
  const [fornecedor, setFornecedor] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [naoEncontrado, setNaoEncontrado] = useState(false);

  useEffect(() => {
    let ativo = true;
    buscarFornecedorPorSlug(slug)
      .then((dados) => {
        if (!ativo) return;
        if (!dados) setNaoEncontrado(true);
        else setFornecedor(dados);
      })
      .catch(() => ativo && setNaoEncontrado(true))
      .finally(() => ativo && setCarregando(false));
    return () => {
      ativo = false;
    };
  }, [slug]);

  if (carregando) {
    return (
      <div className="wrap" style={{ padding: "100px 28px", textAlign: "center" }}>
        Carregando perfil...
      </div>
    );
  }

  if (naoEncontrado || !fornecedor) {
    return (
      <div className="wrap" style={{ padding: "100px 28px", textAlign: "center" }}>
        <h2 style={{ marginBottom: 14 }}>Perfil não encontrado</h2>
        <p style={{ color: "var(--ink-soft)", marginBottom: 24 }}>
          Esse fornecedor não existe ou ainda não foi publicado.
        </p>
        <Link to="/" className="btn btn-primary">
          Voltar para a página inicial
        </Link>
      </div>
    );
  }

  const inicial = (fornecedor.nomeFantasia || fornecedor.razaoSocial || "?")
    .trim()
    .charAt(0)
    .toUpperCase();

  return (
    <>
      <section className="profile-hero">
        <div className="wrap">
          <div className="profile-avatar">{inicial}</div>
          <div>
            <h1>{fornecedor.nomeFantasia || fornecedor.razaoSocial}</h1>
            <div className="meta">
              {fornecedor.cidade} · {fornecedor.servicos?.join(" · ")}
            </div>
            <div className="profile-selos">
              {fornecedor.status === "verificado" ? (
                <span className="badge badge-verificado">✓ Verificado</span>
              ) : (
                <span className="badge badge-pendente">Em verificação</span>
              )}
              {(fornecedor.selos || []).map((s) => (
                <span key={s} className="badge badge-verificado">
                  {SELO_LABELS[s] || s}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="profile-body">
        <div className="wrap profile-grid">
          <div>
            <div className="profile-card">
              <h3>Sobre a empresa</h3>
              <p style={{ color: "var(--ink-soft)", lineHeight: 1.6, fontSize: "0.94rem" }}>
                {fornecedor.descricao || "Esta empresa ainda não adicionou uma descrição."}
              </p>
            </div>
            <div className="profile-card">
              <h3>Serviços oferecidos</h3>
              <div>
                {(fornecedor.servicos || []).map((s) => (
                  <span key={s} className="servico-tag">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div>
            <div className="profile-card">
              <h3>Contato</h3>
              <p style={{ fontSize: "0.9rem", marginBottom: 8 }}>
                <strong>Cidade:</strong> {fornecedor.cidade}
              </p>
              <p style={{ fontSize: "0.9rem", marginBottom: 8 }}>
                <strong>Telefone:</strong> {fornecedor.telefone}
              </p>
              {fornecedor.whatsapp && (
                <p style={{ fontSize: "0.9rem", marginBottom: 16 }}>
                  <strong>WhatsApp:</strong> {fornecedor.whatsapp}
                </p>
              )}
              <a
                href={`https://wa.me/55${(fornecedor.whatsapp || fornecedor.telefone || "").replace(/\D/g, "")}`}
                target="_blank"
                rel="noreferrer"
                className="btn btn-primary"
                style={{ width: "100%" }}
              >
                Falar no WhatsApp
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

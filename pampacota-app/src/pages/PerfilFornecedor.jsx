import { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { buscarFornecedorPorSlug, atualizarLogoFornecedor } from "../lib/data";
import { TIPOS_DOCUMENTO } from "../lib/catalogo";
import DocumentosFornecedor from "../components/DocumentosFornecedor";

const SELO_LABELS = TIPOS_DOCUMENTO.reduce((acc, t) => {
  acc[t.id] = t.label;
  return acc;
}, {});

export default function PerfilFornecedor({ fornecedorLogado }) {
  const { slug } = useParams();
  const [fornecedor, setFornecedor] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [naoEncontrado, setNaoEncontrado] = useState(false);
  const [enviandoLogo, setEnviandoLogo] = useState(false);
  const inputLogoRef = useRef(null);

  useEffect(() => {
    carregar();
  }, [slug]);

  function carregar() {
    setCarregando(true);
    buscarFornecedorPorSlug(slug)
      .then((dados) => {
        if (!dados) setNaoEncontrado(true);
        else setFornecedor(dados);
      })
      .catch(() => setNaoEncontrado(true))
      .finally(() => setCarregando(false));
  }

  const ehProprioPerfil = fornecedorLogado && fornecedorLogado.uid === fornecedor?.uid;

  async function handleLogoChange(e) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    setEnviandoLogo(true);
    try {
      await atualizarLogoFornecedor(fornecedor.uid, arquivo);
      carregar();
    } catch (err) {
      console.error(err);
      alert("Não foi possível enviar o logo agora. Tente novamente.");
    } finally {
      setEnviandoLogo(false);
    }
  }

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
          <div className="profile-avatar-wrap">
            {fornecedor.logoUrl ? (
              <img src={fornecedor.logoUrl} alt="Logo da empresa" className="profile-avatar-img" />
            ) : (
              <div className="profile-avatar">{inicial}</div>
            )}
            {ehProprioPerfil && (
              <>
                <button
                  type="button"
                  className="profile-avatar-edit"
                  onClick={() => inputLogoRef.current?.click()}
                  disabled={enviandoLogo}
                  title={fornecedor.logoUrl ? "Trocar logo" : "Adicionar logo"}
                >
                  {enviandoLogo ? "..." : "✎"}
                </button>
                <input
                  ref={inputLogoRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={handleLogoChange}
                />
              </>
            )}
          </div>
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

            {ehProprioPerfil && (
              <DocumentosFornecedor uid={fornecedor.uid} onAtualizado={carregar} />
            )}
          </div>
        </div>
      </section>
    </>
  );
}

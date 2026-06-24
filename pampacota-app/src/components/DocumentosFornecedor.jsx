import { useEffect, useRef, useState } from "react";
import { TIPOS_DOCUMENTO } from "../lib/catalogo";
import { enviarDocumentoFornecedor, listarDocumentosFornecedor } from "../lib/data";

export default function DocumentosFornecedor({ uid, onAtualizado }) {
  const [enviados, setEnviados] = useState({}); // { tipo: enviadoEm }
  const [carregando, setCarregando] = useState(true);
  const [enviandoTipo, setEnviandoTipo] = useState(null);
  const inputsRef = useRef({});

  useEffect(() => {
    carregar();
  }, [uid]);

  function carregar() {
    setCarregando(true);
    listarDocumentosFornecedor(uid)
      .then((lista) => {
        const mapa = {};
        lista.forEach((d) => {
          mapa[d.tipo] = d.enviado_em;
        });
        setEnviados(mapa);
      })
      .catch((err) => console.error(err))
      .finally(() => setCarregando(false));
  }

  async function handleArquivo(tipo, e) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    setEnviandoTipo(tipo);
    try {
      await enviarDocumentoFornecedor(uid, tipo, arquivo);
      carregar();
      onAtualizado?.();
    } catch (err) {
      console.error(err);
      alert("Não foi possível enviar o documento agora. Tente novamente.");
    } finally {
      setEnviandoTipo(null);
    }
  }

  return (
    <div className="profile-card">
      <h3>Documentos da empresa</h3>
      <p style={{ fontSize: "0.84rem", color: "var(--ink-soft)", marginBottom: 16 }}>
        Envie seus documentos para liberar os selos de verificação no seu perfil
        público. Os arquivos ficam privados — só você pode visualizá-los.
      </p>

      {TIPOS_DOCUMENTO.map((tipo) => {
        const jaEnviado = !!enviados[tipo.id];
        const enviandoAgora = enviandoTipo === tipo.id;
        return (
          <div key={tipo.id} className="documento-row">
            <div>
              <strong style={{ fontSize: "0.9rem" }}>{tipo.label}</strong>
              <p style={{ fontSize: "0.78rem", color: "var(--ink-soft)", margin: 0 }}>
                {tipo.descricao}
              </p>
            </div>
            <div>
              {jaEnviado ? (
                <span className="badge badge-verificado">✓ Enviado</span>
              ) : (
                <span className="badge badge-pendente">Pendente</span>
              )}
              <button
                type="button"
                className="btn btn-ghost documento-btn"
                disabled={enviandoAgora}
                onClick={() => inputsRef.current[tipo.id]?.click()}
              >
                {enviandoAgora ? "Enviando..." : jaEnviado ? "Substituir" : "Enviar"}
              </button>
              <input
                ref={(el) => (inputsRef.current[tipo.id] = el)}
                type="file"
                accept="image/*,.pdf"
                style={{ display: "none" }}
                onChange={(e) => handleArquivo(tipo.id, e)}
              />
            </div>
          </div>
        );
      })}

      {carregando && (
        <p style={{ fontSize: "0.82rem", color: "var(--ink-soft)" }}>Carregando documentos...</p>
      )}
    </div>
  );
}

import { useState } from "react";
import { Navigate } from "react-router-dom";
import { criarCobranca } from "../lib/data";

const PLANOS = [
  { id: "basico", label: "Básico", valor: "1.200", moedas: 1000 },
  { id: "premium", label: "Premium", valor: "2.400", moedas: 1900 },
];

const PACOTES = [
  { id: "pacote_p", label: "Pacote P", valor: "150", moedas: 100 },
  { id: "pacote_m", label: "Pacote M", valor: "400", moedas: 300 },
  { id: "pacote_g", label: "Pacote G", valor: "750", moedas: 600 },
];

export default function Planos({ fornecedorLogado, carregandoAuth }) {
  const [carregandoTipo, setCarregandoTipo] = useState(null);
  const [erro, setErro] = useState("");

  async function handleEscolher(tipo) {
    setCarregandoTipo(tipo);
    setErro("");
    try {
      const resultado = await criarCobranca(fornecedorLogado.uid, tipo);
      if (resultado.invoiceUrl) {
        window.location.href = resultado.invoiceUrl;
      } else {
        setErro("Cobrança criada, mas não foi possível obter o link de pagamento.");
      }
    } catch (err) {
      console.error(err);
      setErro(err.message || "Não foi possível iniciar o pagamento agora.");
    } finally {
      setCarregandoTipo(null);
    }
  }

  if (carregandoAuth) {
    return (
      <div className="wrap" style={{ padding: "100px 28px", textAlign: "center" }}>
        Carregando...
      </div>
    );
  }

  if (!fornecedorLogado) {
    return <Navigate to="/entrar" replace />;
  }

  return (
    <section style={{ padding: "50px 0" }}>
      <div className="wrap" style={{ maxWidth: 900 }}>
        <span className="mono" style={{ color: "var(--gold)" }}>
          Planos e Moedas RS
        </span>
        <h1 style={{ fontSize: "1.9rem", color: "var(--green-deep)", marginTop: 8, marginBottom: 8 }}>
          Escolha como acessar as cotações
        </h1>
        <p style={{ color: "var(--ink-soft)", marginBottom: 28 }}>
          Cada cotação custa Moedas RS proporcional ao total de horas solicitadas (1 hora = 1
          Moeda RS). Assine um plano mensal ou compre um pacote avulso quando precisar.
        </p>

        {erro && <div className="form-msg-error">{erro}</div>}

        <h3 style={{ marginBottom: 14 }}>Assinaturas mensais</h3>
        <div className="planos-grid">
          {PLANOS.map((plano) => (
            <div key={plano.id} className="plano-card">
              <span className="mono" style={{ color: "var(--gold)" }}>{plano.label}</span>
              <div className="plano-valor">
                R$ {plano.valor}<span>/mês</span>
              </div>
              <p className="plano-moedas">{plano.moedas} Moedas RS por mês</p>
              <button
                className="btn btn-primary"
                style={{ width: "100%" }}
                disabled={carregandoTipo === plano.id}
                onClick={() => handleEscolher(plano.id)}
              >
                {carregandoTipo === plano.id ? "Gerando cobrança..." : "Assinar"}
              </button>
            </div>
          ))}
        </div>

        <h3 style={{ margin: "32px 0 14px" }}>Pacotes avulsos (sem assinatura)</h3>
        <div className="planos-grid">
          {PACOTES.map((pacote) => (
            <div key={pacote.id} className="plano-card">
              <span className="mono" style={{ color: "var(--gold)" }}>{pacote.label}</span>
              <div className="plano-valor">R$ {pacote.valor}</div>
              <p className="plano-moedas">{pacote.moedas} Moedas RS</p>
              <button
                className="btn btn-ghost"
                style={{ width: "100%" }}
                disabled={carregandoTipo === pacote.id}
                onClick={() => handleEscolher(pacote.id)}
              >
                {carregandoTipo === pacote.id ? "Gerando cobrança..." : "Comprar"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

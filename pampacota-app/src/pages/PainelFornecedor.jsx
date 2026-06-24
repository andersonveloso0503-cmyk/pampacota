import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import {
  listarCotacoesAbertas,
  pegarCotacao,
  enviarProposta,
  MAX_FORNECEDORES_POR_COTACAO,
} from "../lib/data";
import { getCategoria, getOpcaoRegime } from "../lib/catalogo";

export default function PainelFornecedor({ fornecedorLogado, carregandoAuth }) {
  const [cotacoes, setCotacoes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [cotacaoAtiva, setCotacaoAtiva] = useState(null); // cotação aberta no modal de proposta
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [valor, setValor] = useState("");
  const [mensagem, setMensagem] = useState("");

  useEffect(() => {
    carregar();
  }, []);

  function carregar() {
    setCarregando(true);
    listarCotacoesAbertas()
      .then(setCotacoes)
      .catch((err) => console.error(err))
      .finally(() => setCarregando(false));
  }

  function abrirProposta(cotacao) {
    setCotacaoAtiva(cotacao);
    setValor("");
    setMensagem("");
    setErro("");
  }

  async function handlePegarEEnviar(e) {
    e.preventDefault();
    if (!valor.trim()) {
      setErro("Informe um valor para a proposta.");
      return;
    }
    setEnviando(true);
    setErro("");
    try {
      const jaPegou = cotacaoAtiva.fornecedoresInteressados.includes(fornecedorLogado.uid);

      if (!jaPegou) {
        const resultado = await pegarCotacao(cotacaoAtiva.id, fornecedorLogado.uid);
        if (!resultado.ok) {
          setErro(traduzirMotivo(resultado.motivo, { custo: resultado.custo, saldoAtual: resultado.saldoAtual }));
          setEnviando(false);
          return;
        }
      }

      const resultadoProposta = await enviarProposta(cotacaoAtiva.id, fornecedorLogado.uid, {
        valor: Number(valor),
        mensagem,
      });
      if (!resultadoProposta.ok) {
        setErro(traduzirMotivo(resultadoProposta.motivo));
        setEnviando(false);
        return;
      }

      setCotacaoAtiva(null);
      carregar();
    } catch (err) {
      console.error(err);
      setErro("Não foi possível concluir agora. Tente novamente.");
    } finally {
      setEnviando(false);
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
      <div className="wrap" style={{ maxWidth: 880 }}>
        <span className="mono" style={{ color: "var(--gold)" }}>
          Painel do fornecedor
        </span>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
          <h1 style={{ fontSize: "1.9rem", color: "var(--green-deep)", marginTop: 8, marginBottom: 0 }}>
            Cotações abertas
          </h1>
          <div className="saldo-moedas-card">
            <span className="mono" style={{ color: "var(--ink-soft)" }}>Saldo</span>
            <strong>{fornecedorLogado.saldoMoedas || 0} Moedas RS</strong>
            <Link to="/planos" className="btn btn-gold" style={{ marginLeft: 12 }}>
              Comprar / Assinar
            </Link>
          </div>
        </div>
        <div style={{ height: 24 }} />

        {carregando && <p style={{ color: "var(--ink-soft)" }}>Carregando cotações...</p>}

        {!carregando && cotacoes.length === 0 && (
          <div className="profile-card">
            <p style={{ color: "var(--ink-soft)" }}>
              Nenhuma cotação aberta no momento. Volte mais tarde.
            </p>
          </div>
        )}

        {cotacoes.map((cotacao) => {
          const jaPegou = cotacao.fornecedoresInteressados.includes(fornecedorLogado.uid);
          const vagas = MAX_FORNECEDORES_POR_COTACAO - cotacao.fornecedoresInteressados.length;
          return (
            <div key={cotacao.id} className="cotacao-card-painel">
              <div className="cotacao-card-painel-head">
                <div>
                  <strong>{cotacao.cidade}</strong>
                  <span className="mono" style={{ marginLeft: 10, color: "var(--ink-soft)" }}>
                    {vagas} vaga(s) restante(s)
                  </span>
                  <span className="badge badge-pendente" style={{ marginLeft: 10 }}>
                    {cotacao.horasTotais} Moedas RS
                  </span>
                </div>
                {jaPegou ? (
                  <span className="badge badge-verificado">Você já pegou</span>
                ) : (
                  <button className="btn btn-primary" onClick={() => abrirProposta(cotacao)}>
                    Pegar cotação
                  </button>
                )}
              </div>

              {(cotacao.itens || []).map((item, i) => {
                const cat = getCategoria(item.categoria);
                const regime = getOpcaoRegime(item.categoria, item.regime);
                return (
                  <p key={i} style={{ fontSize: "0.88rem", margin: "4px 0" }}>
                    {cat.icon} <strong>{item.quantidade}x</strong> {cat.label} — {regime.label}
                  </p>
                );
              })}

              {cotacao.descricao && (
                <p style={{ fontSize: "0.85rem", color: "var(--ink-soft)", marginTop: 8 }}>
                  "{cotacao.descricao}"
                </p>
              )}

              {jaPegou && (
                <button
                  className="btn btn-ghost"
                  style={{ marginTop: 10 }}
                  onClick={() => abrirProposta(cotacao)}
                >
                  Editar minha proposta
                </button>
              )}
            </div>
          );
        })}
      </div>

      {cotacaoAtiva && (
        <div className="modal-overlay" onClick={() => setCotacaoAtiva(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: 6 }}>Enviar proposta</h3>
            <p style={{ fontSize: "0.86rem", color: "var(--ink-soft)", marginBottom: 18 }}>
              {cotacaoAtiva.cidade} ·{" "}
              {(cotacaoAtiva.itens || [])
                .map((item) => `${item.quantidade}x ${getCategoria(item.categoria).label}`)
                .join(", ")}
            </p>

            {erro && <div className="form-msg-error">{erro}</div>}

            <form onSubmit={handlePegarEEnviar}>
              <div className="field">
                <label>Valor da proposta (R$)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Ex: 3500"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                />
              </div>
              <div className="field">
                <label>Mensagem (opcional)</label>
                <textarea
                  rows={3}
                  placeholder="Apresente sua empresa e condições..."
                  value={mensagem}
                  onChange={(e) => setMensagem(e.target.value)}
                />
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ flex: 1 }}
                  onClick={() => setCotacaoAtiva(null)}
                >
                  Cancelar
                </button>
                <button className="btn btn-primary" style={{ flex: 1 }} disabled={enviando}>
                  {enviando ? "Enviando..." : "Enviar proposta"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

function traduzirMotivo(motivo, detalhe) {
  const mapa = {
    nao_encontrada: "Cotação não encontrada.",
    fechada: "Essa cotação já atingiu o limite de fornecedores.",
    ja_pegou: "Você já pegou essa cotação.",
    limite_atingido: "Essa cotação já atingiu o limite de 4 fornecedores.",
    nao_pegou_essa_cotacao: "Você precisa pegar a cotação antes de enviar proposta.",
    saldo_insuficiente: detalhe
      ? `Saldo insuficiente. Essa cotação custa ${detalhe.custo} Moedas RS e seu saldo atual é ${detalhe.saldoAtual || 0}.`
      : "Saldo de Moedas RS insuficiente para pegar essa cotação.",
  };
  return mapa[motivo] || "Não foi possível concluir agora.";
}

import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  buscarCotacaoPorCodigo,
  escolherFornecedor,
  buscarFornecedorPorUid,
  MAX_FORNECEDORES_POR_COTACAO,
} from "../lib/data";
import { getCategoria, getOpcaoRegime } from "../lib/catalogo";

export default function AcompanharCotacao() {
  const { codigo } = useParams();
  const [cotacao, setCotacao] = useState(null);
  const [fornecedoresPropostas, setFornecedoresPropostas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [naoEncontrada, setNaoEncontrada] = useState(false);
  const [escolhendo, setEscolhendo] = useState(false);

  useEffect(() => {
    carregar();
  }, [codigo]);

  async function carregar() {
    setCarregando(true);
    try {
      const dados = await buscarCotacaoPorCodigo(codigo);
      if (!dados) {
        setNaoEncontrada(true);
        return;
      }
      setCotacao(dados);

      // busca os perfis dos fornecedores que enviaram proposta
      const propostas = dados.propostas || [];
      const perfis = await Promise.all(
        propostas.map(async (p) => {
          const fornecedor = await buscarFornecedorPorUid(p.fornecedorUid);
          return { ...p, fornecedor };
        })
      );
      setFornecedoresPropostas(perfis);
    } catch (err) {
      console.error(err);
      setNaoEncontrada(true);
    } finally {
      setCarregando(false);
    }
  }

  async function handleEscolher(fornecedorUid) {
    if (!confirm("Confirmar escolha deste fornecedor? Os demais serão notificados que não foram selecionados.")) {
      return;
    }
    setEscolhendo(true);
    try {
      await escolherFornecedor(cotacao.id, fornecedorUid);
      await carregar();
    } catch (err) {
      console.error(err);
      alert("Não foi possível confirmar agora. Tente novamente.");
    } finally {
      setEscolhendo(false);
    }
  }

  if (carregando) {
    return (
      <div className="wrap" style={{ padding: "100px 28px", textAlign: "center" }}>
        Carregando sua cotação...
      </div>
    );
  }

  if (naoEncontrada || !cotacao) {
    return (
      <div className="wrap" style={{ padding: "100px 28px", textAlign: "center" }}>
        <h2 style={{ marginBottom: 14 }}>Cotação não encontrada</h2>
        <p style={{ color: "var(--ink-soft)", marginBottom: 24 }}>
          Verifique se o link está completo e correto.
        </p>
        <Link to="/" className="btn btn-primary">
          Voltar para a página inicial
        </Link>
      </div>
    );
  }

  const interessados = cotacao.fornecedoresInteressados || [];
  const vagasOcupadas = interessados.length;

  return (
    <section style={{ padding: "60px 0" }}>
      <div className="wrap" style={{ maxWidth: 760 }}>
        <span className="mono" style={{ color: "var(--gold)" }}>
          Sua cotação
        </span>
        <h1 style={{ fontSize: "1.9rem", color: "var(--green-deep)", marginTop: 8, marginBottom: 6 }}>
          {cotacao.cidade}
        </h1>
        <p style={{ color: "var(--ink-soft)", marginBottom: 28 }}>
          {vagasOcupadas} de {MAX_FORNECEDORES_POR_COTACAO} vagas de fornecedores ocupadas
          {cotacao.status === "fechada_escolhida" && " · Fornecedor já escolhido"}
        </p>

        <div className="profile-card">
          <h3>Itens solicitados</h3>
          {(cotacao.itens || []).map((item, i) => {
            const cat = getCategoria(item.categoria);
            const regime = getOpcaoRegime(item.categoria, item.regime);
            return (
              <p key={i} style={{ fontSize: "0.92rem", marginBottom: 6 }}>
                {cat.icon} <strong>{item.quantidade}x</strong> {cat.label} — {regime.label}
              </p>
            );
          })}
          {cotacao.descricao && (
            <p style={{ fontSize: "0.88rem", color: "var(--ink-soft)", marginTop: 12 }}>
              "{cotacao.descricao}"
            </p>
          )}
        </div>

        {cotacao.fotos && cotacao.fotos.length > 0 && (
          <div className="profile-card">
            <h3>Fotos do local</h3>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {cotacao.fotos.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt={`Foto do local ${i + 1}`}
                  style={{ width: 110, height: 110, objectFit: "cover", borderRadius: 8 }}
                />
              ))}
            </div>
          </div>
        )}

        <div className="profile-card">
          <h3>Propostas recebidas ({fornecedoresPropostas.length})</h3>

          {fornecedoresPropostas.length === 0 && (
            <p style={{ color: "var(--ink-soft)", fontSize: "0.9rem" }}>
              Ainda não há propostas. Fornecedores da sua região foram notificados e
              devem responder em breve.
            </p>
          )}

          {fornecedoresPropostas.map((p, i) => {
            const f = p.fornecedor;
            const escolhido = cotacao.fornecedorEscolhidoUid === p.fornecedorUid;
            return (
              <div
                key={i}
                style={{
                  border: "1.5px solid var(--line)",
                  borderRadius: 10,
                  padding: 18,
                  marginBottom: 12,
                  background: escolhido ? "#EAF3EC" : "var(--white)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <strong>{f?.nomeFantasia || f?.razaoSocial || "Fornecedor"}</strong>
                    {f?.status === "verificado" && (
                      <span className="badge badge-verificado" style={{ marginLeft: 8 }}>
                        ✓ Verificado
                      </span>
                    )}
                    <p style={{ fontSize: "0.88rem", color: "var(--ink-soft)", marginTop: 6 }}>
                      {p.mensagem}
                    </p>
                    {p.valor && (
                      <p style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--green-deep)", marginTop: 6 }}>
                        R$ {Number(p.valor).toLocaleString("pt-BR")}
                      </p>
                    )}
                  </div>
                  {escolhido ? (
                    <span className="badge badge-verificado">Escolhido</span>
                  ) : (
                    cotacao.status !== "fechada_escolhida" && (
                      <button
                        className="btn btn-primary"
                        disabled={escolhendo}
                        onClick={() => handleEscolher(p.fornecedorUid)}
                      >
                        Escolher
                      </button>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

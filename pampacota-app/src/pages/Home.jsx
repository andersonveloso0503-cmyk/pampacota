import { useState } from "react";
import { Link } from "react-router-dom";
import RsMark from "../components/RsMark";
import ItemCotacaoForm from "../components/ItemCotacaoForm";
import { criarCotacao } from "../lib/data";
import { CATEGORIAS, calcularHorasTotais, calcularPessoasTotais } from "../lib/catalogo";

function novoItem() {
  const cat = CATEGORIAS[0];
  return {
    categoria: cat.id,
    quantidade: 1,
    regime: cat.opcoesRegime[0].id,
  };
}

export default function Home() {
  const [etapaCotacao, setEtapaCotacao] = useState(1);
  const [itens, setItens] = useState([novoItem()]);
  const [dadosContato, setDadosContato] = useState({ cidade: "", telefone: "", descricao: "" });
  const [fotos, setFotos] = useState([]);
  const [status, setStatus] = useState("idle"); // idle | loading | ok | error
  const [errorMsg, setErrorMsg] = useState("");
  const [linkAcompanhamento, setLinkAcompanhamento] = useState(null);

  function updateContato(field, value) {
    setDadosContato((f) => ({ ...f, [field]: value }));
  }

  function updateItem(index, novoValor) {
    setItens((lista) => lista.map((it, i) => (i === index ? novoValor : it)));
  }

  function adicionarItem() {
    setItens((lista) => [...lista, novoItem()]);
  }

  function removerItem(index) {
    setItens((lista) => lista.filter((_, i) => i !== index));
  }

  function handleFotosChange(e) {
    const arquivos = Array.from(e.target.files || []).slice(0, 5);
    setFotos(arquivos);
  }

  function irParaContato() {
    setEtapaCotacao(2);
    setStatus("idle");
    setErrorMsg("");
  }

  function voltarParaItens() {
    setEtapaCotacao(1);
    setStatus("idle");
    setErrorMsg("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!dadosContato.cidade.trim() || !dadosContato.telefone.trim()) {
      setStatus("error");
      setErrorMsg("Preencha cidade e telefone para receber as propostas.");
      return;
    }
    setStatus("loading");
    try {
      const horasTotais = calcularHorasTotais(itens);
      const pessoasTotais = calcularPessoasTotais(itens);
      const cotacao = await criarCotacao({
        itens,
        horasTotais,
        pessoasTotais,
        fotos,
        ...dadosContato,
      });
      setStatus("ok");
      setLinkAcompanhamento(`${window.location.origin}/cotacao/${cotacao.codigoAcesso}`);
      setItens([novoItem()]);
      setDadosContato({ cidade: "", telefone: "", descricao: "" });
      setFotos([]);
      setEtapaCotacao(1);
    } catch (err) {
      console.error(err);
      setStatus("error");
      setErrorMsg("Não foi possível enviar agora. Tente novamente em instantes.");
    }
  }

  return (
    <>
      <section className="hero">
        <RsMark style={{ top: "-40px", right: "-120px" }} />
        <div className="wrap hero-grid">
          <div>
            <span className="eyebrow mono">Marketplace B2B · Rio Grande do Sul</span>
            <h1>
              Cotação de fornecedores,{" "}
              <span className="underline">
                do jeito gaúcho
                <svg viewBox="0 0 220 14" preserveAspectRatio="none">
                  <path
                    d="M2 9 C 50 2, 170 2, 218 9"
                    stroke="#C9A24B"
                    strokeWidth="3"
                    fill="none"
                    strokeLinecap="round"
                  />
                </svg>
              </span>{" "}
              de fazer negócio.
            </h1>
            <p className="lead">
              Descreva o que sua empresa precisa e receba propostas de
              fornecedores verificados em até 24h. Sem ligação chata, sem
              intermediário escondido — só negócio direto.
            </p>
            <div className="hero-ctas">
              <a href="#cotacao" className="btn btn-primary btn-lg">
                Pedir cotação grátis
              </a>
              <Link to="/cadastro-fornecedor" className="btn btn-ghost btn-lg">
                Sou fornecedor →
              </Link>
            </div>
            <div className="trust-row">
              <div className="trust-item">
                <span className="num">1.200+</span>
                <span className="label">fornecedores ativos</span>
              </div>
              <div className="trust-item">
                <span className="num">24h</span>
                <span className="label">tempo médio de resposta</span>
              </div>
              <div className="trust-item">
                <span className="num">100%</span>
                <span className="label">gratuito para buscar</span>
              </div>
            </div>
          </div>

          <form className="quote-card" id="cotacao" onSubmit={handleSubmit}>
            <span className="mono">Cotação rápida</span>
            <h3>O que você está buscando?</h3>

            <div className="quote-steps">
              <div className={`quote-step-dot ${etapaCotacao >= 1 ? "ativa" : ""}`}>1</div>
              <div className="quote-step-linha" />
              <div className={`quote-step-dot ${etapaCotacao >= 2 ? "ativa" : ""}`}>2</div>
            </div>

            {status === "ok" && (
              <div className="form-msg-ok">
                Cotação enviada! Até 4 fornecedores da sua região vão poder
                enviar proposta.
                {linkAcompanhamento && (
                  <>
                    <br />
                    Guarde este link para acompanhar as propostas:
                    <br />
                    <a href={linkAcompanhamento} style={{ fontWeight: 700, wordBreak: "break-all" }}>
                      {linkAcompanhamento}
                    </a>
                  </>
                )}
              </div>
            )}
            {status === "error" && (
              <div className="form-msg-error">{errorMsg}</div>
            )}

            {etapaCotacao === 1 && (
              <>
                <p className="sub">Descreva os serviços que você precisa.</p>

                {itens.map((item, i) => (
                  <ItemCotacaoForm
                    key={i}
                    item={item}
                    onChange={(novo) => updateItem(i, novo)}
                    onRemove={() => removerItem(i)}
                    podeRemover={itens.length > 1}
                  />
                ))}

                <button type="button" className="btn btn-ghost btn-add-item" onClick={adicionarItem}>
                  + Adicionar outro serviço
                </button>

                <button type="button" className="btn btn-primary" style={{ width: "100%", marginTop: 6 }} onClick={irParaContato}>
                  Continuar →
                </button>
              </>
            )}

            {etapaCotacao === 2 && (
              <>
                <p className="sub">Agora seus dados de contato e do local.</p>

                <div className="field-row">
                  <div className="field">
                    <label>Cidade</label>
                    <input
                      type="text"
                      placeholder="Porto Alegre"
                      value={dadosContato.cidade}
                      onChange={(e) => updateContato("cidade", e.target.value)}
                    />
                  </div>
                  <div className="field">
                    <label>Telefone / WhatsApp</label>
                    <input
                      type="text"
                      placeholder="(51) 9...."
                      value={dadosContato.telefone}
                      onChange={(e) => updateContato("telefone", e.target.value)}
                    />
                  </div>
                </div>
                <div className="field">
                  <label>Fotos do local (até 5)</label>
                  <input type="file" accept="image/*" multiple onChange={handleFotosChange} />
                  {fotos.length > 0 && (
                    <p style={{ fontSize: "0.78rem", color: "var(--ink-soft)", marginTop: 6 }}>
                      {fotos.length} foto(s) selecionada(s)
                    </p>
                  )}
                </div>
                <div className="field">
                  <label>Observações (opcional)</label>
                  <textarea
                    rows={2}
                    placeholder="Algum detalhe extra que os fornecedores devem saber..."
                    value={dadosContato.descricao}
                    onChange={(e) => updateContato("descricao", e.target.value)}
                  />
                </div>

                <div style={{ display: "flex", gap: 10 }}>
                  <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={voltarParaItens}>
                    ← Voltar
                  </button>
                  <button className="btn btn-primary" style={{ flex: 2 }} disabled={status === "loading"}>
                    {status === "loading" ? "Enviando..." : "Receber propostas →"}
                  </button>
                </div>
                <p className="fine">
                  Ao continuar você concorda com nossos termos de uso.
                </p>
              </>
            )}
          </form>
        </div>
      </section>

      <section className="how" id="como-funciona">
        <RsMark style={{ bottom: "-100px", left: "-100px" }} />
        <div className="wrap">
          <div className="section-head">
            <span className="mono">O processo</span>
            <h2>Da necessidade ao contrato, em três passos</h2>
            <p>
              É a mesma lógica de uma boa indicação — só que mais rápida, e
              com mais opção de escolha.
            </p>
          </div>
          <div className="steps">
            <div className="step">
              <span className="stage">Passo 1</span>
              <h3>Você descreve a demanda</h3>
              <p>
                Conte o que precisa: tipo de serviço, cidade, escala. Leva
                menos de 2 minutos.
              </p>
            </div>
            <div className="step">
              <span className="stage">Passo 2</span>
              <h3>Fornecedores respondem</h3>
              <p>
                Empresas verificadas da sua região enviam proposta direto pelo
                seu WhatsApp ou e-mail.
              </p>
            </div>
            <div className="step">
              <span className="stage">Passo 3</span>
              <h3>Você escolhe e negocia</h3>
              <p>
                Compare propostas, fale direto com quem te atende melhor, sem
                comissão sobre o contrato.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="categorias">
        <div className="wrap">
          <div className="section-head">
            <span className="mono">Categorias</span>
            <h2>O que você pode cotar na PampaCota</h2>
          </div>
          <div className="cat-grid">
            <div className="cat-card">
              <div className="icon">🧹</div>
              <h4>Limpeza e conservação</h4>
              <p>Condomínios, empresas e indústrias.</p>
            </div>
            <div className="cat-card">
              <div className="icon">🛎️</div>
              <h4>Portaria e recepção</h4>
              <p>Equipes treinadas para residencial e comercial.</p>
            </div>
            <div className="cat-card">
              <div className="icon">🛡️</div>
              <h4>Segurança patrimonial</h4>
              <p>Vigilância armada e desarmada.</p>
            </div>
            <div className="cat-card">
              <div className="icon">🔧</div>
              <h4>Zeladoria e manutenção</h4>
              <p>Manutenção predial e jardinagem.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="supplier-strip" id="fornecedores">
        <div className="wrap strip-grid">
          <div>
            <span
              className="mono"
              style={{ color: "var(--green)", display: "block", marginBottom: 14 }}
            >
              Para fornecedores
            </span>
            <h2>Apareça pra quem já tá procurando comprar</h2>
            <p>
              Cadastre sua empresa, escolha até 3 serviços pra destacar no seu
              perfil, e comece a receber pedidos de cotação de compradores
              reais do Rio Grande do Sul.
            </p>
            <div className="seal-row">
              <span className="seal">
                <span className="dot"></span> Selo Federal
              </span>
              <span className="seal">
                <span className="dot"></span> Selo Estadual
              </span>
              <span className="seal">
                <span className="dot"></span> Selo Trabalhista
              </span>
              <span className="seal">
                <span className="dot"></span> Selo Municipal
              </span>
            </div>
            <div style={{ marginTop: 30 }}>
              <Link to="/cadastro-fornecedor" className="btn btn-gold btn-lg">
                Cadastrar minha empresa →
              </Link>
            </div>
          </div>
          <div className="benefits-list">
            <div className="benefit">
              <span className="num">01</span>
              <div>
                <h4>Perfil público verificado</h4>
                <p>
                  Compradores veem seus selos, avaliações e serviços antes de
                  te chamar.
                </p>
              </div>
            </div>
            <div className="benefit">
              <span className="num">02</span>
              <div>
                <h4>Leads direto no seu painel</h4>
                <p>
                  Cada cotação compatível chega pra você — sem leilão de
                  lance, sem disputa por clique.
                </p>
              </div>
            </div>
            <div className="benefit">
              <span className="num">03</span>
              <div>
                <h4>Teste grátis por tempo ilimitado</h4>
                <p>
                  Funcionalidades básicas liberadas sem custo, com upgrade
                  opcional pra mais visibilidade.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="depoimentos">
        <div className="wrap">
          <div className="section-head">
            <span className="mono">Depoimentos</span>
            <h2>Quem já fechou negócio por aqui</h2>
          </div>
          <div className="testi-grid">
            <div className="testi-card">
              <span className="quote-mark">"</span>
              <p className="text">
                Recebi três propostas no mesmo dia. Fechei com uma empresa de
                Caxias que nem sabia que existia.
              </p>
              <div className="testi-who">
                <div className="avatar">RC</div>
                <div>
                  <div className="name">Renata Costa</div>
                  <div className="role">Síndica, Porto Alegre</div>
                </div>
              </div>
            </div>
            <div className="testi-card">
              <span className="quote-mark">"</span>
              <p className="text">
                Como fornecedor, o perfil com selo deu mais credibilidade na
                hora de fechar com condomínios maiores.
              </p>
              <div className="testi-who">
                <div className="avatar">MS</div>
                <div>
                  <div className="name">Marcos Silveira</div>
                  <div className="role">Diretor, Zelar Serviços</div>
                </div>
              </div>
            </div>
            <div className="testi-card">
              <span className="quote-mark">"</span>
              <p className="text">
                Plataforma simples, atendimento rápido. Não fico mais ligando
                pra empresa por empresa pra orçar.
              </p>
              <div className="testi-who">
                <div className="avatar">JP</div>
                <div>
                  <div className="name">João Pellegrini</div>
                  <div className="role">Gestor predial</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="final-cta">
          <RsMark style={{}} />
          <h2>Pronto pra cotar ou pra ser encontrado?</h2>
          <p>Leva dois minutos pra começar — e nenhum centavo até você decidir.</p>
          <div className="hero-ctas">
            <a href="#cotacao" className="btn btn-gold btn-lg">
              Pedir cotação
            </a>
            <Link
              to="/cadastro-fornecedor"
              className="btn"
              style={{
                background: "rgba(255,255,255,0.1)",
                color: "#fff",
                border: "1.5px solid rgba(255,255,255,0.3)",
              }}
            >
              Cadastrar empresa
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

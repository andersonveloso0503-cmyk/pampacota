import { Link } from "react-router-dom";

export default function Header({ fornecedor, onLogout }) {
  return (
    <header className="site-header">
      <div className="nav">
        <Link to="/" className="logo-wrap">
          <span className="logo">
            <span className="dot"></span> PampaCota
          </span>
          <span className="logo-faixa-rs" aria-hidden="true"></span>
        </Link>
        <div className="nav-links">
          <Link to="/#como-funciona">Como funciona</Link>
          <Link to="/#categorias">Categorias</Link>
          <Link to="/#fornecedores">Para fornecedores</Link>
          <Link to="/planos">Planos</Link>
          <Link to="/#depoimentos">Depoimentos</Link>
        </div>
        <div className="nav-actions">
          {fornecedor ? (
            <>
              <Link to="/painel" className="btn btn-ghost">
                Painel
              </Link>
              <Link to={`/empresa/${fornecedor.slug}`} className="btn btn-ghost nav-actions-perfil">
                Meu perfil
              </Link>
              <button onClick={onLogout} className="btn btn-primary">
                Sair
              </button>
            </>
          ) : (
            <>
              <Link to="/entrar" className="btn btn-ghost">
                Entrar
              </Link>
              <Link to="/cadastro-fornecedor" className="btn btn-primary">
                Sou fornecedor
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
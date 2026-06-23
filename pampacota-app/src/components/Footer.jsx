import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="wrap">
        <div className="foot-grid">
          <div>
            <div className="foot-logo">PampaCota</div>
            <p>
              Marketplace gaúcho de cotação entre empresas. Conectamos quem
              precisa de serviço terceirizado a fornecedores verificados em
              todo o Rio Grande do Sul.
            </p>
          </div>
          <div className="foot-col">
            <h5>Plataforma</h5>
            <Link to="/#como-funciona">Como funciona</Link>
            <Link to="/#categorias">Categorias</Link>
            <Link to="/#depoimentos">Depoimentos</Link>
          </div>
          <div className="foot-col">
            <h5>Fornecedores</h5>
            <Link to="/cadastro-fornecedor">Cadastrar empresa</Link>
            <Link to="/entrar">Entrar</Link>
          </div>
          <div className="foot-col">
            <h5>Contato</h5>
            <a href="mailto:contato@pampacota.com.br">contato@pampacota.com.br</a>
            <span>Porto Alegre, RS</span>
          </div>
        </div>
        <div className="foot-bottom">
          <span>© {new Date().getFullYear()} PampaCota. Todos os direitos reservados.</span>
          <span>Feito no Rio Grande do Sul</span>
        </div>
      </div>
    </footer>
  );
}

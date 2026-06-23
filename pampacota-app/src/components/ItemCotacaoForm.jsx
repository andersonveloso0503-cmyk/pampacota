import { CATEGORIAS, getCategoria } from "../lib/catalogo";

export default function ItemCotacaoForm({ item, onChange, onRemove, podeRemover }) {
  const categoria = getCategoria(item.categoria);

  function update(field, value) {
    const novo = { ...item, [field]: value };
    // se trocou de categoria, reseta o regime pra primeira opção válida da nova categoria
    if (field === "categoria") {
      const novaCat = getCategoria(value);
      novo.regime = novaCat.opcoesRegime[0].id;
    }
    onChange(novo);
  }

  return (
    <div className="item-cotacao-card">
      <div className="item-cotacao-head">
        <span className="item-cotacao-icon">{categoria.icon}</span>
        {podeRemover && (
          <button type="button" className="item-cotacao-remove" onClick={onRemove}>
            Remover
          </button>
        )}
      </div>

      <div className="field">
        <label>Categoria</label>
        <select value={item.categoria} onChange={(e) => update("categoria", e.target.value)}>
          {CATEGORIAS.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <div className="field-row">
        <div className="field">
          <label>Quantidade de pessoas</label>
          <input
            type="number"
            min={1}
            value={item.quantidade}
            onChange={(e) => update("quantidade", Math.max(1, Number(e.target.value) || 1))}
          />
        </div>
        <div className="field">
          <label>Regime / carga horária</label>
          <select value={item.regime} onChange={(e) => update("regime", e.target.value)}>
            {categoria.opcoesRegime.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

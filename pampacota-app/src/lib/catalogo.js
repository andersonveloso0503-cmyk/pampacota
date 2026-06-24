// Catálogo central de categorias de serviço e seus regimes de carga horária.
// Cada categoria define que tipo de "regime" se aplica (por turno ou por hora mensal),
// e a lista de opções que aparecem no formulário de cotação.
// Isso também é a base usada depois para calcular o "tamanho" de uma cotação
// (quantidade de pessoas x regime) e decidir se cabe no plano do fornecedor.

export const TIPO_REGIME = {
  TURNO: "turno", // ex: 8h diurno, 12x36 noturno
  HORA_MENSAL: "hora_mensal", // ex: 100h/mês, 220h/mês
};

export const CATEGORIAS = [
  {
    id: "portaria",
    label: "Portaria e recepção",
    icon: "🛎️",
    tipoRegime: TIPO_REGIME.TURNO,
    opcoesRegime: [
      { id: "8h_diurno", label: "8h por dia — diurno" },
      { id: "8h_noturno", label: "8h por dia — noturno" },
      { id: "12x36_diurno", label: "12x36 — diurno" },
      { id: "12x36_noturno", label: "12x36 — noturno" },
    ],
  },
  {
    id: "limpeza",
    label: "Limpeza e conservação",
    icon: "🧹",
    tipoRegime: TIPO_REGIME.HORA_MENSAL,
    opcoesRegime: [
      { id: "100h_mes", label: "100h por mês" },
      { id: "160h_mes", label: "160h por mês" },
      { id: "220h_mes", label: "220h por mês" },
    ],
  },
  {
    id: "seguranca",
    label: "Segurança patrimonial",
    icon: "🛡️",
    tipoRegime: TIPO_REGIME.TURNO,
    opcoesRegime: [
      { id: "8h_diurno", label: "8h por dia — diurno" },
      { id: "8h_noturno", label: "8h por dia — noturno" },
      { id: "12x36_diurno", label: "12x36 — diurno" },
      { id: "12x36_noturno", label: "12x36 — noturno" },
    ],
  },
  {
    id: "zeladoria",
    label: "Zeladoria / manutenção predial",
    icon: "🔧",
    tipoRegime: TIPO_REGIME.HORA_MENSAL,
    opcoesRegime: [
      { id: "100h_mes", label: "100h por mês" },
      { id: "160h_mes", label: "160h por mês" },
      { id: "220h_mes", label: "220h por mês" },
    ],
  },
];

export function getCategoria(id) {
  return CATEGORIAS.find((c) => c.id === id) || CATEGORIAS[0];
}

export function getOpcaoRegime(categoriaId, regimeId) {
  const cat = getCategoria(categoriaId);
  return cat.opcoesRegime.find((o) => o.id === regimeId) || cat.opcoesRegime[0];
}

// Calcula um "peso" total de horas/mês equivalente para a cotação inteira.
// Usado mais pra frente para decidir se cabe no plano Básico/Premium do fornecedor.
const HORAS_POR_REGIME_TURNO = {
  "8h_diurno": 176, // ~22 dias úteis x 8h
  "8h_noturno": 176,
  "12x36_diurno": 180, // média mensal de um regime 12x36
  "12x36_noturno": 180,
};
const HORAS_POR_REGIME_MENSAL = {
  "100h_mes": 100,
  "160h_mes": 160,
  "220h_mes": 220,
};

export function calcularHorasItem(item) {
  const cat = getCategoria(item.categoria);
  const horasUnitarias =
    cat.tipoRegime === TIPO_REGIME.TURNO
      ? HORAS_POR_REGIME_TURNO[item.regime] || 0
      : HORAS_POR_REGIME_MENSAL[item.regime] || 0;
  return horasUnitarias * (item.quantidade || 1);
}

export function calcularHorasTotais(itens) {
  return (itens || []).reduce((total, item) => total + calcularHorasItem(item), 0);
}

export function calcularPessoasTotais(itens) {
  return (itens || []).reduce((total, item) => total + (item.quantidade || 1), 0);
}

// ---------- Documentos / selos de verificação do fornecedor ----------

export const TIPOS_DOCUMENTO = [
  { id: "federal", label: "Certidão Federal", descricao: "Certidão Negativa de Débitos Federais" },
  { id: "estadual", label: "Certidão Estadual", descricao: "Certidão Negativa de Débitos Estaduais" },
  { id: "trabalhista", label: "Certidão Trabalhista", descricao: "Certidão Negativa de Débitos Trabalhistas (CNDT)" },
  { id: "municipal", label: "Certidão Municipal", descricao: "Certidão Negativa de Débitos Municipais" },
  { id: "fgts", label: "Certificado FGTS", descricao: "Certificado de Regularidade do FGTS" },
  { id: "contrato_social", label: "Contrato Social", descricao: "Contrato social ou último aditivo registrado" },
];

export function getTipoDocumento(id) {
  return TIPOS_DOCUMENTO.find((t) => t.id === id);
}

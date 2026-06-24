// Helper compartilhado pelas funções serverless que conversam com o Asaas.
// A API Key NUNCA é exposta ao navegador — só existe aqui, lida de uma
// variável de ambiente configurada na Vercel (Settings → Environment Variables).

const ASAAS_API_URL =
  process.env.ASAAS_ENV === "production"
    ? "https://api.asaas.com/v3"
    : "https://sandbox.asaas.com/api/v3";

export async function asaasFetch(path, options = {}) {
  const apiKey = process.env.ASAAS_API_KEY;
  if (!apiKey) {
    throw new Error("ASAAS_API_KEY não configurada nas variáveis de ambiente.");
  }

  const response = await fetch(`${ASAAS_API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      access_token: apiKey,
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const mensagem = data?.errors?.[0]?.description || "Erro na comunicação com o Asaas.";
    const erro = new Error(mensagem);
    erro.status = response.status;
    erro.data = data;
    throw erro;
  }

  return data;
}

// Planos e pacotes — única fonte de verdade dos valores e quantidades de moedas.
// Mude aqui se os preços ou quantidades de moedas precisarem ser ajustados.
export const PLANOS = {
  basico: { label: "Básico", valor: 1200.0, moedas: 1000, cycle: "MONTHLY" },
  premium: { label: "Premium", valor: 2400.0, moedas: 1900, cycle: "MONTHLY" },
};

export const PACOTES_AVULSOS = {
  pacote_p: { label: "Pacote P", valor: 150.0, moedas: 100 },
  pacote_m: { label: "Pacote M", valor: 400.0, moedas: 300 },
  pacote_g: { label: "Pacote G", valor: 750.0, moedas: 600 },
};

// POST /api/criar-cobranca
// Body: { fornecedorUid, tipo: 'basico' | 'premium' | 'pacote_p' | 'pacote_m' | 'pacote_g' }
//
// Cria (ou reutiliza) o cliente no Asaas, e cria uma assinatura (planos) ou
// uma cobrança avulsa (pacotes). Retorna a URL da fatura para o fornecedor pagar.

import { asaasFetch, PLANOS, PACOTES_AVULSOS } from "./_asaasClient.js";
import { getSupabaseAdmin } from "./_supabaseAdmin.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido." });
  }

  try {
    const { fornecedorUid, tipo } = req.body;
    if (!fornecedorUid || !tipo) {
      return res.status(400).json({ error: "fornecedorUid e tipo são obrigatórios." });
    }

    const ehPlano = tipo === "basico" || tipo === "premium";
    const ehPacote = Object.keys(PACOTES_AVULSOS).includes(tipo);
    if (!ehPlano && !ehPacote) {
      return res.status(400).json({ error: "Tipo inválido." });
    }

    const supabase = getSupabaseAdmin();

    const { data: fornecedor, error: fornecedorError } = await supabase
      .from("fornecedores")
      .select("*")
      .eq("uid", fornecedorUid)
      .single();
    if (fornecedorError || !fornecedor) {
      return res.status(404).json({ error: "Fornecedor não encontrado." });
    }

    // 1. garante que existe um cliente no Asaas para esse fornecedor
    let asaasCustomerId = fornecedor.asaas_customer_id;
    if (!asaasCustomerId) {
      const customer = await asaasFetch("/customers", {
        method: "POST",
        body: JSON.stringify({
          name: fornecedor.nome_fantasia || fornecedor.razao_social,
          email: fornecedor.email,
          cpfCnpj: fornecedor.cnpj.replace(/\D/g, ""),
          phone: (fornecedor.telefone || "").replace(/\D/g, ""),
        }),
      });
      asaasCustomerId = customer.id;
      await supabase
        .from("fornecedores")
        .update({ asaas_customer_id: asaasCustomerId })
        .eq("uid", fornecedorUid);
    }

    const hoje = new Date().toISOString().slice(0, 10);

    if (ehPlano) {
      const plano = PLANOS[tipo];
      const assinatura = await asaasFetch("/subscriptions", {
        method: "POST",
        body: JSON.stringify({
          customer: asaasCustomerId,
          billingType: "UNDEFINED", // o pagador escolhe Pix, boleto ou cartão na fatura
          nextDueDate: hoje,
          value: plano.valor,
          cycle: plano.cycle,
          description: `PampaCota — Plano ${plano.label}`,
        }),
      });

      // busca a primeira cobrança gerada pela assinatura, para retornar o link de pagamento
      const cobrancas = await asaasFetch(`/subscriptions/${assinatura.id}/payments`);
      const primeiraCobranca = cobrancas.data?.[0];

      await supabase.from("pagamentos").insert({
        fornecedor_uid: fornecedorUid,
        asaas_payment_id: primeiraCobranca?.id || null,
        asaas_subscription_id: assinatura.id,
        tipo: `assinatura_${tipo}`,
        valor: plano.valor,
        status: "pendente",
      });

      return res.status(200).json({
        ok: true,
        invoiceUrl: primeiraCobranca?.invoiceUrl || null,
      });
    }

    // pacote avulso → cobrança única
    const pacote = PACOTES_AVULSOS[tipo];
    const cobranca = await asaasFetch("/payments", {
      method: "POST",
      body: JSON.stringify({
        customer: asaasCustomerId,
        billingType: "UNDEFINED",
        dueDate: hoje,
        value: pacote.valor,
        description: `PampaCota — ${pacote.label} (${pacote.moedas} Moedas RS)`,
      }),
    });

    await supabase.from("pagamentos").insert({
      fornecedor_uid: fornecedorUid,
      asaas_payment_id: cobranca.id,
      tipo,
      valor: pacote.valor,
      status: "pendente",
    });

    return res.status(200).json({ ok: true, invoiceUrl: cobranca.invoiceUrl });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || "Erro interno." });
  }
}

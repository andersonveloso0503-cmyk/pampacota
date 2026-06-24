// POST /api/webhook-asaas
// Configurar essa URL no painel do Asaas: Configurações → Integrações → Webhooks
// Evento a assinar: PAYMENT_CONFIRMED (e opcionalmente PAYMENT_RECEIVED)
//
// Quando um pagamento é confirmado, credita as Moedas RS correspondentes
// (assinatura mensal ou pacote avulso) no saldo do fornecedor.

import { PLANOS, PACOTES_AVULSOS } from "./_asaasClient.js";
import { getSupabaseAdmin } from "./_supabaseAdmin.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido." });
  }

  try {
    // validação simples de segurança: o Asaas permite configurar um token
    // customizado enviado no header "asaas-access-token" do webhook
    const tokenEsperado = process.env.ASAAS_WEBHOOK_TOKEN;
    if (tokenEsperado) {
      const tokenRecebido = req.headers["asaas-access-token"];
      if (tokenRecebido !== tokenEsperado) {
        return res.status(401).json({ error: "Token inválido." });
      }
    }

    const evento = req.body;
    const payment = evento?.payment;
    if (!payment) {
      return res.status(200).json({ ok: true, ignorado: "sem payment no body" });
    }

    // só processa eventos de confirmação de pagamento
    if (evento.event !== "PAYMENT_CONFIRMED" && evento.event !== "PAYMENT_RECEIVED") {
      return res.status(200).json({ ok: true, ignorado: evento.event });
    }

    const supabase = getSupabaseAdmin();

    // busca o registro de pagamento correspondente (pode ter sido criado pelo
    // payment.id direto, ou pelo subscription.id no caso da primeira cobrança)
    const { data: pagamentos } = await supabase
      .from("pagamentos")
      .select("*")
      .or(
        `asaas_payment_id.eq.${payment.id},asaas_subscription_id.eq.${payment.subscription || "null"}`
      )
      .eq("status", "pendente");

    if (!pagamentos || pagamentos.length === 0) {
      return res.status(200).json({ ok: true, ignorado: "pagamento não encontrado/já processado" });
    }

    for (const registro of pagamentos) {
      // marca o pagamento como confirmado
      await supabase
        .from("pagamentos")
        .update({
          status: "confirmado",
          confirmado_em: new Date().toISOString(),
          asaas_payment_id: payment.id,
        })
        .eq("id", registro.id);

      const ehPlano = registro.tipo.startsWith("assinatura_");
      let moedasParaCreditar = 0;

      if (ehPlano) {
        const chave = registro.tipo.replace("assinatura_", "");
        moedasParaCreditar = PLANOS[chave]?.moedas || 0;

        // atualiza o plano ativo e a data de renovação (próximo mês)
        const proximaRenovacao = new Date();
        proximaRenovacao.setMonth(proximaRenovacao.getMonth() + 1);
        await supabase
          .from("fornecedores")
          .update({ plano_ativo: chave, plano_renovacao_em: proximaRenovacao.toISOString() })
          .eq("uid", registro.fornecedor_uid);
      } else {
        moedasParaCreditar = PACOTES_AVULSOS[registro.tipo]?.moedas || 0;
      }

      if (moedasParaCreditar > 0) {
        const { data: fornecedorAtual } = await supabase
          .from("fornecedores")
          .select("saldo_moedas")
          .eq("uid", registro.fornecedor_uid)
          .single();

        await supabase
          .from("fornecedores")
          .update({ saldo_moedas: (fornecedorAtual?.saldo_moedas || 0) + moedasParaCreditar })
          .eq("uid", registro.fornecedor_uid);

        await supabase.from("transacoes_moedas").insert({
          fornecedor_uid: registro.fornecedor_uid,
          tipo: ehPlano ? "credito_assinatura" : "credito_pacote_avulso",
          quantidade: moedasParaCreditar,
          referencia: payment.id,
        });
      }
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || "Erro interno." });
  }
}

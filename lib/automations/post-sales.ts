import { createServiceClient } from "@/lib/supabase/server";
import { createProvider } from "@/lib/whatsapp/factory";
import { normalizeWhatsAppPhone } from "@/lib/whatsapp/phone";
import type { WhatsAppAccount } from "@/lib/supabase/database.types";

export async function sendPostSalesAutomation(tenantId: string, leadId: string) {
  try {
    const supabase = createServiceClient();

    // 1. Fetch Lead
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("name, phone, email")
      .eq("id", leadId)
      .single();

    if (leadError || !lead) {
      console.error("[post-sales] Lead not found:", leadId, leadError);
      return;
    }

    if (!lead.phone) {
      console.warn("[post-sales] Lead has no phone number, skipping WhatsApp send:", leadId);
      return;
    }

    // 2. Fetch Active WhatsApp Account
    const { data: account } = await supabase
      .from("whatsapp_accounts")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (!account) {
      console.warn("[post-sales] No active WhatsApp account for tenant:", tenantId);
      return;
    }

    // 3. Format message
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://solaire-w-crm.guigui-couto23.workers.dev";
    const message = `Olá, ${lead.name}! Que notícia maravilhosa! Fechamos a data para o show da Super Banda Choppão! 🎶🕺

Para organizarmos os detalhes logísticos do evento (horários, endereço, faturamento e rider técnico), por favor preencha o nosso formulário pelo link abaixo:
👉 ${appUrl}/forms/post-sales/${leadId}

Além disso, solicitamos o envio do contrato assinado ou da Nota de Empenho assim que possível pelo nosso canal de atendimento.

Qualquer dúvida, estamos à disposição!`;

    // 4. Find or Create Conversation
    let convId: string | undefined;
    const { data: conv } = await supabase
      .from("conversations")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("lead_id", leadId)
      .eq("channel", "whatsapp")
      .maybeSingle();

    if (conv) {
      convId = conv.id;
    } else {
      const { data: createdConv } = await supabase
        .from("conversations")
        .insert({
          tenant_id: tenantId,
          lead_id: leadId,
          whatsapp_account_id: account.id,
          channel: "whatsapp",
          last_message_at: new Date().toISOString(),
          status: "aguardando",
        })
        .select("id")
        .single();
      convId = createdConv?.id;
    }

    if (!convId) {
      console.error("[post-sales] Failed to find or create conversation for lead:", leadId);
      return;
    }

    // 5. Insert Message
    const { data: pending, error: msgError } = await supabase
      .from("messages")
      .insert({
        tenant_id: tenantId,
        conversation_id: convId,
        direction: "outbound",
        body: message,
        status: "pending",
      })
      .select("id")
      .single();

    if (msgError || !pending) {
      console.error("[post-sales] Failed to insert message:", msgError);
      return;
    }

    // 6. Send via WhatsApp Provider
    const leadPhone = lead.phone;
    const normalized = normalizeWhatsAppPhone(leadPhone) ?? leadPhone.replace(/\D/g, "");
    if (normalized) {
      try {
        const provider = createProvider(account as unknown as WhatsAppAccount);
        const sendResult = await provider.send({ to: normalized, body: message });
        
        await supabase
          .from("messages")
          .update(
            sendResult.status === "sent"
              ? { status: "sent", external_id: sendResult.externalId }
              : { status: "failed", error: "Falha no envio pelo provedor" },
          )
          .eq("id", pending.id);

        if (sendResult.status === "sent") {
          await supabase
            .from("conversations")
            .update({ last_message_at: new Date().toISOString(), status: "aguardando" })
            .eq("id", convId);
        }
      } catch (sendErr) {
        console.error("[post-sales] Error calling WhatsApp provider:", sendErr);
        await supabase
          .from("messages")
          .update({ status: "failed", error: (sendErr as Error).message })
          .eq("id", pending.id);
      }
    }

    // 7. Log Activity
    await supabase.from("lead_activities").insert({
      tenant_id: tenantId,
      lead_id: leadId,
      kind: "automation",
      payload: { message: "Mensagem de Pós-Venda enviada automaticamente para solicitar dados e empenho." },
    });

    // 8. Create follow-up task (due in 2 days)
    const dueAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
    await supabase.from("tasks").insert({
      tenant_id: tenantId,
      lead_id: leadId,
      title: "Verificar recebimento do empenho/contrato e respostas do formulário",
      due_at: dueAt,
      status: "open",
    });

  } catch (err) {
    console.error("[post-sales] Critical error in post sales automation flow:", err);
  }
}

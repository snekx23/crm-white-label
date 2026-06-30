import { createServiceClient } from "@/lib/supabase/server";
import { createProvider } from "@/lib/whatsapp/factory";
import { normalizeWhatsAppPhone } from "@/lib/whatsapp/phone";
import type { WhatsAppAccount, FileRow } from "@/lib/supabase/database.types";

export async function sendContractsFileToClient(tenantId: string, leadId: string, file: FileRow) {
  try {
    const supabase = createServiceClient();

    // 1. Fetch Lead
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("name, phone")
      .eq("id", leadId)
      .single();

    if (leadError || !lead) {
      console.error("[contracts-dispatch] Lead not found:", leadId, leadError);
      return;
    }

    if (!lead.phone) {
      console.warn("[contracts-dispatch] Lead has no phone number, skipping automatic send:", leadId);
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
      console.warn("[contracts-dispatch] No active WhatsApp account for tenant:", tenantId);
      return;
    }

    // 3. Create a 7-day signed URL for the PDF
    const { data: signedData, error: signedError } = await supabase.storage
      .from("lead-files")
      .createSignedUrl(file.storage_path, 60 * 60 * 24 * 7);

    if (signedError || !signedData?.signedUrl) {
      console.error("[contracts-dispatch] Failed to generate signed URL:", signedError);
      return;
    }

    const signedUrl = signedData.signedUrl;
    const cleanFileName = file.name.replace("[CONTRATO_EMPENHO] - ", "");

    // 4. Message Content
    const messageBody = `Olá ${lead.name.split(" ")[0] || "tudo bem"}, segue em anexo a Nota de Empenho confirmando a reserva financeira do nosso show. Até breve!`;

    // 5. Find or Create Conversation
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
      console.error("[contracts-dispatch] Failed to find/create conversation for lead:", leadId);
      return;
    }

    // 6. Insert Message
    const { data: pending, error: msgError } = await supabase
      .from("messages")
      .insert({
        tenant_id: tenantId,
        conversation_id: convId,
        direction: "outbound",
        body: messageBody,
        status: "pending",
        media_url: signedUrl,
        media_type: "application/pdf",
      })
      .select("id")
      .single();

    if (msgError || !pending) {
      console.error("[contracts-dispatch] Failed to insert message in DB:", msgError);
      return;
    }

    // 7. Send via Provider
    const normalized = normalizeWhatsAppPhone(lead.phone) ?? lead.phone.replace(/\D/g, "");
    if (normalized) {
      try {
        const provider = createProvider(account as unknown as WhatsAppAccount);
        let sendResult;

        if (provider.sendMedia) {
          sendResult = await provider.sendMedia({
            to: normalized,
            mediaUrl: signedUrl,
            mediaKind: "document",
            caption: messageBody,
            fileName: cleanFileName,
            mimeType: "application/pdf",
          });
        } else {
          sendResult = await provider.send({
            to: normalized,
            body: messageBody,
            mediaUrl: signedUrl,
            mediaType: "application/pdf",
          });
        }

        // 8. Update DB Message Status
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
        console.error("[contracts-dispatch] Error dispatching message through provider:", sendErr);
        await supabase
          .from("messages")
          .update({ status: "failed", error: (sendErr as Error).message })
          .eq("id", pending.id);
      }
    }

    // 9. Log Activity
    await supabase.from("lead_activities").insert({
      tenant_id: tenantId,
      lead_id: leadId,
      kind: "automation",
      payload: {
        message: "Nota de Empenho enviada automaticamente.",
      },
    });

  } catch (err) {
    console.error("[contracts-dispatch] Critical error in automatic contract dispatch flow:", err);
  }
}

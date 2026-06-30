import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireContext } from "@/lib/tenant";
import { createProvider } from "@/lib/whatsapp/factory";
import { normalizeWhatsAppPhone } from "@/lib/whatsapp/phone";
import type { WhatsAppAccount } from "@/lib/supabase/database.types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireContext();
    const body = await req.json();
    const { leadId, message, mediaUrl } = body;

    if (!leadId || !message) {
      return NextResponse.json({ error: "Missing required parameters (leadId, message)" }, { status: 400 });
    }

    const supabase = createServiceClient();

    // 1. Fetch Lead details
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("name, phone")
      .eq("tenant_id", ctx.tenantId)
      .eq("id", leadId)
      .single();

    if (leadError || !lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    if (!lead.phone) {
      return NextResponse.json({ error: "Lead has no phone number" }, { status: 400 });
    }

    // 2. Fetch Active WhatsApp account
    const { data: account } = await supabase
      .from("whatsapp_accounts")
      .select("*")
      .eq("tenant_id", ctx.tenantId)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (!account) {
      return NextResponse.json({ error: "No active WhatsApp gateway configured" }, { status: 400 });
    }

    // 3. Find or Create Conversation
    let convId: string | undefined;
    const { data: conv } = await supabase
      .from("conversations")
      .select("id")
      .eq("tenant_id", ctx.tenantId)
      .eq("lead_id", leadId)
      .eq("channel", "whatsapp")
      .maybeSingle();

    if (conv) {
      convId = conv.id;
    } else {
      const { data: createdConv } = await supabase
        .from("conversations")
        .insert({
          tenant_id: ctx.tenantId,
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
      return NextResponse.json({ error: "Failed to resolve conversation thread" }, { status: 500 });
    }

    // Determine media type if media URL is passed
    let mediaType: string | undefined;
    if (mediaUrl) {
      const ext = mediaUrl.split("?")[0].split(".").pop()?.toLowerCase();
      mediaType = ["png", "jpg", "jpeg", "webp"].includes(ext || "") ? "image" : "document";
    }

    // 4. Insert Pending Message
    const { data: msgRow, error: msgError } = await supabase
      .from("messages")
      .insert({
        tenant_id: ctx.tenantId,
        conversation_id: convId,
        direction: "outbound",
        body: message,
        status: "pending",
        media_url: mediaUrl || null,
        media_type: mediaType || null,
      })
      .select("id")
      .single();

    if (msgError || !msgRow) {
      return NextResponse.json({ error: "Failed to register message in database" }, { status: 500 });
    }

    // 5. Send via WhatsApp Provider
    const normalized = normalizeWhatsAppPhone(lead.phone) ?? lead.phone.replace(/\D/g, "");
    const provider = createProvider(account as unknown as WhatsAppAccount);
    let sendResult;

    try {
      if (mediaUrl && provider.sendMedia) {
        sendResult = await provider.sendMedia({
          to: normalized,
          mediaUrl,
          mediaKind: mediaType as "image" | "document",
          caption: message,
          fileName: mediaType === "image" ? "flyer.jpg" : "anexo.pdf",
        });
      } else {
        sendResult = await provider.send({
          to: normalized,
          body: message,
          mediaUrl: mediaUrl || undefined,
          mediaType: mediaType || undefined,
        });
      }

      // Update message status on success
      await supabase
        .from("messages")
        .update({
          status: sendResult.status === "sent" ? "sent" : "failed",
          external_id: sendResult.externalId || null,
        })
        .eq("id", msgRow.id);

      if (sendResult.status === "sent") {
        await supabase
          .from("conversations")
          .update({ last_message_at: new Date().toISOString(), status: "aguardando" })
          .eq("id", convId);
      }
    } catch (sendErr) {
      console.error("[disparos-send-single] Provider error:", sendErr);
      await supabase
        .from("messages")
        .update({ status: "failed", error: (sendErr as Error).message })
        .eq("id", msgRow.id);
    }

    // 6. Log Lead Activity
    await supabase.from("lead_activities").insert({
      tenant_id: ctx.tenantId,
      lead_id: leadId,
      kind: "automation",
      payload: {
        message: `Campanha de marketing disparada por lote para o contato: "${message.slice(0, 50)}..."`,
      },
    });

    return NextResponse.json({ success: true, messageId: msgRow.id });
  } catch (err) {
    console.error("[disparos-send-single] Critical error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireContext } from "@/lib/tenant";
import { createProvider } from "@/lib/whatsapp/factory";
import { normalizeWhatsAppPhone } from "@/lib/whatsapp/phone";
import type { WhatsAppAccount } from "@/lib/supabase/database.types";
import type { ChatMessage } from "@/lib/chat/types";

function providerErrorMessage(result: { status: string; raw?: unknown }): string {
  if (result.raw && typeof result.raw === "object") {
    const r = result.raw as Record<string, unknown>;
    if (typeof r.error === "string") return r.error;
    if (typeof r.message === "string") return r.message;
  }
  return "Falha ao enviar mensagem pelo WhatsApp";
}

export async function sendChatMessage(input: {
  leadId: string;
  body: string;
}): Promise<{ conversationId: string; message: ChatMessage }> {
  const ctx = await requireContext();
  const supabase = await createClient();

  const { data: lead } = await supabase
    .from("leads")
    .select("id, phone, name")
    .eq("id", input.leadId)
    .eq("tenant_id", ctx.tenantId)
    .single();
  if (!lead?.phone) throw new Error("Lead sem telefone");

  const to = normalizeWhatsAppPhone(lead.phone);
  if (to && to !== lead.phone.replace(/\D/g, "")) {
    await supabase.from("leads").update({ phone: to }).eq("id", lead.id).eq("tenant_id", ctx.tenantId);
  }

  const { data: account } = await supabase
    .from("whatsapp_accounts")
    .select("*")
    .eq("tenant_id", ctx.tenantId)
    .eq("is_active", true)
    .limit(1)
    .single();

  let conversationId: string | undefined;
  const { data: conv } = await supabase
    .from("conversations")
    .select("id")
    .eq("tenant_id", ctx.tenantId)
    .eq("lead_id", lead.id)
    .eq("channel", "whatsapp")
    .maybeSingle();

  if (conv?.id) {
    conversationId = conv.id;
  } else {
    const { data: created } = await supabase
      .from("conversations")
      .insert({
        tenant_id: ctx.tenantId,
        lead_id: lead.id,
        whatsapp_account_id: account?.id ?? null,
        channel: "whatsapp",
        last_message_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    conversationId = created?.id;
  }

  if (!conversationId) throw new Error("Falha ao criar conversa");

  const { data: pendingMsg } = await supabase
    .from("messages")
    .insert({
      tenant_id: ctx.tenantId,
      conversation_id: conversationId,
      user_id: ctx.userId,
      direction: "outbound",
      body: input.body,
      status: "pending",
    })
    .select("id")
    .single();

  if (!account) {
    await supabase
      .from("messages")
      .update({ status: "failed", error: "Nenhuma conta WhatsApp configurada" })
      .eq("id", pendingMsg!.id);
    revalidatePath(`/chat/${lead.id}`);
    throw new Error("Configure uma conta WhatsApp em /settings/whatsapp");
  }

  try {
    const provider = createProvider(account as WhatsAppAccount);
    const result = await provider.send({ to, body: input.body });
    if (result.status !== "sent") {
      const errMsg = providerErrorMessage(result);
      await supabase
        .from("messages")
        .update({ status: "failed", error: errMsg })
        .eq("id", pendingMsg!.id);
      throw new Error(errMsg);
    }
    const { data: sentRow } = await supabase
      .from("messages")
      .update({
        status: "sent",
        external_id: result.externalId,
      })
      .eq("id", pendingMsg!.id)
      .select("id, body, direction, created_at, status")
      .single();
    await supabase
      .from("conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", conversationId);

    revalidatePath(`/chat/${lead.id}`);
    revalidatePath("/chat");

    return {
      conversationId,
      message: (sentRow ?? {
        id: pendingMsg!.id,
        body: input.body,
        direction: "outbound",
        created_at: new Date().toISOString(),
        status: "sent",
      }) as ChatMessage,
    };
  } catch (e) {
    await supabase
      .from("messages")
      .update({ status: "failed", error: (e as Error).message })
      .eq("id", pendingMsg!.id);
    throw e;
  }
}

export async function markConversationRead(conversationId: string) {
  const ctx = await requireContext();
  const supabase = await createClient();
  await supabase
    .from("conversations")
    .update({ unread_count: 0 })
    .eq("id", conversationId)
    .eq("tenant_id", ctx.tenantId);
}

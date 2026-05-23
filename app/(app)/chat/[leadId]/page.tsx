import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireContext } from "@/lib/tenant";
import { displayLeadName } from "@/lib/leads/display";
import { listQuickMessages } from "@/app/(app)/settings/quick-messages-actions";
import { ChatThread } from "./chat-thread";

export default async function ChatThreadPage({ params }: { params: Promise<{ leadId: string }> }) {
  const { leadId } = await params;
  const ctx = await requireContext();
  const supabase = await createClient();

  const leadRes = await supabase
    .from("leads")
    .select("id, name, phone")
    .eq("id", leadId)
    .eq("tenant_id", ctx.tenantId)
    .single();

  const lead = leadRes.data as { id: string; name: string; phone: string | null } | null;
  if (!lead) notFound();

  const convoRes = await supabase
    .from("conversations")
    .select("id")
    .eq("tenant_id", ctx.tenantId)
    .eq("lead_id", leadId)
    .eq("channel", "whatsapp")
    .maybeSingle();

  const convo = convoRes.data as { id: string } | null;

  let messages: {
    id: string;
    body: string | null;
    direction: "inbound" | "outbound";
    created_at: string;
    status: string;
  }[] = [];

  if (convo?.id) {
    const { data } = await supabase
      .from("messages")
      .select("id, body, direction, created_at, status, media_url, media_type")
      .eq("conversation_id", convo.id)
      .order("created_at", { ascending: true })
      .limit(500);
    messages = (data ?? []) as typeof messages;
  }

  const quickMessages = await listQuickMessages();

  return (
    <ChatThread
      leadId={lead.id}
      leadName={displayLeadName(lead.name, lead.phone)}
      leadPhone={lead.phone ?? ""}
      conversationId={convo?.id ?? null}
      initialMessages={messages}
      quickMessages={quickMessages}
    />
  );
}

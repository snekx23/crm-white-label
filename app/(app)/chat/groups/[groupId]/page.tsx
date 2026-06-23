import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { requireContext } from "@/lib/tenant";
import { listQuickMessages } from "@/app/(app)/settings/quick-messages-actions";
import { GroupChatThread, type GroupThreadMessage } from "./group-chat-thread";

function payloadRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function readText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export default async function GroupChatPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  const ctx = await requireContext();
  const supabase = createServiceClient();

  const { data: group } = await supabase
    .from("whatsapp_groups")
    .select("id, provider_group_id, subject, description, participant_count")
    .eq("id", groupId)
    .eq("tenant_id", ctx.tenantId)
    .single();

  if (!group) notFound();

  const [{ data: messageLogs }, { data: assignments }] = await Promise.all([
    supabase
      .from("whatsapp_webhook_logs")
      .select("id, from_me, payload, created_at")
      .eq("tenant_id", ctx.tenantId)
      .eq("event_type", "GROUP_MESSAGE")
      .eq("contact_lid", group.provider_group_id)
      .order("created_at", { ascending: true })
      .limit(500),
    supabase
      .from("whatsapp_group_label_assignments")
      .select("whatsapp_group_labels(id, name, color)")
      .eq("tenant_id", ctx.tenantId)
      .eq("group_id", group.id),
  ]);

  const labels = (assignments ?? [])
    .flatMap((assignment) => {
      const label = assignment.whatsapp_group_labels;
      if (!label) return [];
      return Array.isArray(label) ? label : [label];
    })
    .filter((label) => label.id && label.name);

  const messages: GroupThreadMessage[] = (messageLogs ?? []).map((log) => {
    const payload = payloadRecord(log.payload);
    return {
      id: log.id,
      externalId: readText(payload.external_id),
      direction: payload.direction === "outbound" || log.from_me ? "outbound" : "inbound",
      body: readText(payload.body) ?? "",
      senderName: readText(payload.sender_name),
      senderJid: readText(payload.sender_jid),
      mediaUrl: readText(payload.media_url),
      mediaType: readText(payload.media_type),
      createdAt: readText(payload.message_at) ?? log.created_at,
    };
  });

  const quickMessages = await listQuickMessages();

  return (
    <GroupChatThread
      groupId={group.id}
      tenantId={ctx.tenantId}
      subject={group.subject}
      participantCount={group.participant_count}
      labels={labels}
      initialMessages={messages}
      quickMessages={quickMessages}
    />
  );
}

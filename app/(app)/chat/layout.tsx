import { createClient } from "@/lib/supabase/server";
import { requireContext } from "@/lib/tenant";
import { buildConversationItems } from "@/lib/chat/build-conversation-items";
import type { ConversationLeadRow } from "@/lib/chat/conversation-filter";
import { ConversationListLive } from "@/components/chat/conversation-list-live";
import type { WhatsAppAccount } from "@/lib/supabase/database.types";
export default async function ChatLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireContext();
  const supabase = await createClient();

  const [{ data: conversations }, { data: waAccount }] = await Promise.all([
    supabase
      .from("conversations")
      .select("id, lead_id, last_message_at, unread_count, leads(name, phone, whatsapp_lid)")
      .eq("tenant_id", ctx.tenantId)
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .limit(100),
    supabase
      .from("whatsapp_accounts")
      .select("*")
      .eq("tenant_id", ctx.tenantId)
      .eq("is_active", true)
      .maybeSingle(),
  ]);

  const rows = (conversations ?? []) as unknown as ConversationLeadRow[];
  const convIds = rows.map((c) => c.id);

  let messagePreviews: { conversation_id: string; body: string | null; direction: string }[] = [];
  if (convIds.length > 0) {
    const { data: msgs } = await supabase
      .from("messages")
      .select("conversation_id, body, direction, created_at")
      .in("conversation_id", convIds)
      .order("created_at", { ascending: false })
      .limit(500);
    messagePreviews = msgs ?? [];
  }

  const items = buildConversationItems(
    rows,
    messagePreviews,
    (waAccount as WhatsAppAccount | null) ?? null,
  );

  return (
    <div className="flex h-[calc(100vh-3.5rem)] min-h-0 overflow-hidden bg-background">
      <ConversationListLive tenantId={ctx.tenantId} initialItems={items} />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}

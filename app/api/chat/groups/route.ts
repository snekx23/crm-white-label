import { NextResponse } from "next/server";
import { buildWhatsAppGroupItems } from "@/lib/chat/group-items";
import { createServiceClient } from "@/lib/supabase/server";
import { requireContext } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET() {
  const ctx = await requireContext();
  const supabase = createServiceClient();

  const { data: groups, error } = await supabase
    .from("whatsapp_groups")
    .select("id, provider_group_id, subject, description, participant_count, last_event_type, last_event_at, updated_at")
    .eq("tenant_id", ctx.tenantId)
    .order("last_event_at", { ascending: false, nullsFirst: false })
    .limit(500);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const groupRows = (groups ?? []) as Parameters<typeof buildWhatsAppGroupItems>[0];
  const groupIds = groupRows.map((group) => group.id);
  let assignments: {
    group_id: string;
    whatsapp_group_labels: { id: string; name: string; color: string } | null;
  }[] = [];

  if (groupIds.length > 0) {
    const { data, error: labelsError } = await supabase
      .from("whatsapp_group_label_assignments")
      .select("group_id, whatsapp_group_labels(id, name, color)")
      .in("group_id", groupIds);
    if (labelsError) return NextResponse.json({ error: labelsError.message }, { status: 500 });
    assignments = (data ?? []) as typeof assignments;
  }

  const { data: messageLogs, error: logsError } = await supabase
    .from("whatsapp_webhook_logs")
    .select("contact_lid, from_me, payload, created_at")
    .eq("tenant_id", ctx.tenantId)
    .eq("event_type", "GROUP_MESSAGE")
    .order("created_at", { ascending: false })
    .limit(1000);

  if (logsError) return NextResponse.json({ error: logsError.message }, { status: 500 });

  const logs = (messageLogs ?? []) as Parameters<typeof buildWhatsAppGroupItems>[2];

  return NextResponse.json({ groups: buildWhatsAppGroupItems(groupRows, assignments, logs) });
}

import type { SupabaseClient } from "@supabase/supabase-js";

export async function findOrCreateInstagramLead(
  supabase: SupabaseClient,
  tenantId: string,
  opts: {
    senderId: string;
    name?: string | null;
    stageId?: string;
    pipelineId?: string;
  },
): Promise<string | null> {
  const { senderId, name, stageId, pipelineId } = opts;

  const { data: existing } = await supabase
    .from("leads")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("instagram_sender_id", senderId)
    .maybeSingle();

  if (existing?.id) return existing.id;

  const { data: created, error } = await supabase
    .from("leads")
    .insert({
      tenant_id: tenantId,
      instagram_sender_id: senderId,
      name: name || `Instagram ${senderId.slice(-6)}`,
      source: "instagram",
      pipeline_id: pipelineId ?? null,
      stage_id: stageId ?? null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[instagram] find-or-create error", error.message);
    return null;
  }

  return created?.id ?? null;
}

import { createServiceClient } from "@/lib/supabase/server";

export type TriggerKind =
  | "lead_created"
  | "stage_changed"
  | "message_received"
  | "appointment_created"
  | "appointment_near"
  | "lead_inactive";

export async function fireAutomationTrigger(
  tenantId: string,
  kind: TriggerKind,
  leadId: string,
  payload: Record<string, unknown> = {},
) {
  try {
    const supabase = createServiceClient();

    // Respeita o desligamento de automações por lead (atendimento humano assume)
    const { data: leadRow } = await supabase
      .from("leads")
      .select("automations_enabled")
      .eq("id", leadId)
      .maybeSingle();
    if (leadRow && (leadRow as { automations_enabled?: boolean }).automations_enabled === false) {
      return;
    }

    const { data: flows } = await supabase
      .from("automation_flows")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("trigger_kind", kind)
      .eq("status", "active");

    if (!flows || flows.length === 0) return;

    for (const flow of flows) {
      // Get latest published version
      const { data: version } = await supabase
        .from("automation_versions")
        .select("id")
        .eq("flow_id", flow.id)
        .not("published_at", "is", null)
        .order("version_number", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!version) continue;

      const idempotencyKey = `${flow.id}:${leadId}:${kind}:${Date.now()}`;

      const { data: execution } = await supabase
        .from("automation_executions")
        .insert({
          tenant_id: tenantId,
          flow_id: flow.id,
          version_id: version.id,
          lead_id: leadId,
          trigger_kind: kind,
          trigger_payload: payload,
          idempotency_key: idempotencyKey,
          status: "running",
        })
        .select("id")
        .single();

      if (!execution) continue;

      // Queue the first pending step so the processor picks it up
      await supabase.from("automation_execution_steps").insert({
        execution_id: execution.id,
        tenant_id: tenantId,
        block_id: "__start__",
        block_type: "start",
        status: "pending",
      });
    }
  } catch (err) {
    console.error("[automations] fire trigger error", err);
  }
}

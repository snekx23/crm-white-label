"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireContext } from "@/lib/tenant";
import type { TriggerKind } from "@/lib/automations/trigger";

export async function createFlow(formData: FormData) {
  const ctx = await requireContext();
  const supabase = await createClient();

  const name = String(formData.get("name") || "").trim();
  const triggerKind = String(formData.get("trigger_kind") || "lead_created") as TriggerKind;
  const description = String(formData.get("description") || "").trim();

  if (!name) return;

  const { data: flow } = await supabase
    .from("automation_flows")
    .insert({
      tenant_id: ctx.tenantId,
      name,
      description: description || null,
      trigger_kind: triggerKind,
      status: "draft",
    })
    .select("id")
    .single();

  if (!flow) return;

  // Create initial version with a trigger block pre-configured
  await supabase.from("automation_versions").insert({
    flow_id: flow.id,
    tenant_id: ctx.tenantId,
    version_number: 1,
    config: {
      blocks: [
        {
          id: "trigger_1",
          type: "trigger",
          position: { x: 250, y: 50 },
          data: { label: triggerLabelMap[triggerKind] ?? triggerKind, kind: triggerKind, config: {} },
        },
      ],
      connections: [],
    },
  });

  redirect(`/automations/${flow.id}/editor`);
}

export async function updateFlowStatus(flowId: string, status: "draft" | "active" | "paused") {
  const ctx = await requireContext();
  const supabase = await createClient();

  await supabase
    .from("automation_flows")
    .update({ status })
    .eq("id", flowId)
    .eq("tenant_id", ctx.tenantId);

  revalidatePath("/automations");
  revalidatePath(`/automations/${flowId}/editor`);
}

export async function deleteFlow(flowId: string) {
  const ctx = await requireContext();
  const supabase = await createClient();

  await supabase
    .from("automation_flows")
    .delete()
    .eq("id", flowId)
    .eq("tenant_id", ctx.tenantId);

  revalidatePath("/automations");
  redirect("/automations");
}

export async function saveFlowVersion(
  flowId: string,
  config: { blocks: unknown[]; connections: unknown[] },
) {
  const ctx = await requireContext();
  const supabase = await createClient();

  // Get latest version number
  const { data: latest } = await supabase
    .from("automation_versions")
    .select("version_number")
    .eq("flow_id", flowId)
    .eq("tenant_id", ctx.tenantId)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextVersion = ((latest as { version_number?: number } | null)?.version_number ?? 0) + 1;

  await supabase.from("automation_versions").insert({
    flow_id: flowId,
    tenant_id: ctx.tenantId,
    version_number: nextVersion,
    config,
    published_at: new Date().toISOString(),
  });

  // Activate the flow when saved
  await supabase
    .from("automation_flows")
    .update({ status: "active" })
    .eq("id", flowId)
    .eq("tenant_id", ctx.tenantId);

  revalidatePath(`/automations/${flowId}/editor`);
  revalidatePath("/automations");
}

const triggerLabelMap: Record<string, string> = {
  lead_created: "Lead criado",
  stage_changed: "Etapa alterada",
  message_received: "Mensagem recebida",
  appointment_created: "Agendamento criado",
  appointment_near: "Agendamento proximo",
  lead_inactive: "Lead inativo",
};

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireContext } from "@/lib/tenant";
import { normalizePhone } from "@/lib/utils";

const leadSchema = z.object({
  name: z.string().min(1, "Nome obrigatorio"),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  source: z.string().optional(),
  notes: z.string().optional(),
  stage_id: z.string().uuid().optional(),
  value_cents: z.number().int().min(0).optional(),
});

export async function createLead(formData: FormData) {
  const ctx = await requireContext();
  const supabase = await createClient();

  const parsed = leadSchema.parse({
    name: formData.get("name"),
    phone: formData.get("phone") || undefined,
    email: formData.get("email") || undefined,
    source: formData.get("source") || undefined,
    notes: formData.get("notes") || undefined,
    stage_id: formData.get("stage_id") || undefined,
    value_cents: formData.get("value_cents")
      ? Math.round(Number(formData.get("value_cents")) * 100)
      : 0,
  });

  let stageId = parsed.stage_id;
  if (!stageId) {
    const { data: pipeline } = await supabase
      .from("pipelines")
      .select("id, pipeline_stages(id, position)")
      .eq("tenant_id", ctx.tenantId)
      .eq("is_default", true)
      .single();
    const stages = (pipeline as { pipeline_stages?: { id: string; position: number }[] } | null)
      ?.pipeline_stages?.sort((a, b) => a.position - b.position);
    stageId = stages?.[0]?.id;
  }

  const { data: pipelineRow } = await supabase
    .from("pipeline_stages")
    .select("pipeline_id")
    .eq("id", stageId!)
    .single();

  const { error } = await supabase.from("leads").insert({
    tenant_id: ctx.tenantId,
    name: parsed.name,
    phone: parsed.phone ? normalizePhone(parsed.phone) : null,
    email: parsed.email || null,
    source: parsed.source || null,
    notes: parsed.notes || null,
    stage_id: stageId,
    pipeline_id: pipelineRow?.pipeline_id,
    value_cents: parsed.value_cents ?? 0,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/leads");
  revalidatePath("/kanban");
}

export async function updateLead(id: string, patch: Partial<{
  name: string;
  phone: string;
  email: string;
  source: string;
  notes: string;
  stage_id: string;
  value_cents: number;
  position: number;
}>) {
  const ctx = await requireContext();
  const supabase = await createClient();

  const data = { ...patch };
  if (data.phone) data.phone = normalizePhone(data.phone);

  const { error } = await supabase
    .from("leads")
    .update(data)
    .eq("id", id)
    .eq("tenant_id", ctx.tenantId);

  if (error) throw new Error(error.message);
  revalidatePath("/leads");
  revalidatePath("/kanban");
  revalidatePath(`/leads/${id}`);
}

export async function moveLeadToStage(leadId: string, stageId: string, position: number) {
  return updateLead(leadId, { stage_id: stageId, position });
}

export async function deleteLead(id: string) {
  const ctx = await requireContext();
  if (ctx.role === "vendedor") throw new Error("Sem permissao para excluir leads");
  const supabase = await createClient();
  const { error } = await supabase
    .from("leads")
    .delete()
    .eq("id", id)
    .eq("tenant_id", ctx.tenantId);
  if (error) throw new Error(error.message);
  revalidatePath("/leads");
  revalidatePath("/kanban");
  revalidatePath("/chat");
}

export async function importLeadsCSV(rows: Array<{ name: string; phone?: string; email?: string; source?: string }>) {
  const ctx = await requireContext();
  const supabase = await createClient();

  const { data: pipeline } = await supabase
    .from("pipelines")
    .select("id, pipeline_stages(id, position)")
    .eq("tenant_id", ctx.tenantId)
    .eq("is_default", true)
    .single();
  const stages = (pipeline as { pipeline_stages?: { id: string; position: number }[] } | null)
    ?.pipeline_stages?.sort((a, b) => a.position - b.position);
  const stageId = stages?.[0]?.id;
  const pipelineId = (pipeline as { id?: string } | null)?.id;

  const inserts = rows
    .filter((r) => r.name?.trim())
    .map((r) => ({
      tenant_id: ctx.tenantId,
      name: r.name.trim(),
      phone: r.phone ? normalizePhone(r.phone) : null,
      email: r.email?.trim() || null,
      source: r.source?.trim() || "csv-import",
      stage_id: stageId,
      pipeline_id: pipelineId,
    }));

  if (inserts.length === 0) return { count: 0 };
  const { error, count } = await supabase.from("leads").insert(inserts).select("id", { count: "exact" });
  if (error) throw new Error(error.message);
  revalidatePath("/leads");
  revalidatePath("/kanban");
  return { count: count ?? inserts.length };
}

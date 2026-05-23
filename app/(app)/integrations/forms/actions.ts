"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireContext } from "@/lib/tenant";

export async function createIntakeKey(input: { name: string; source_label?: string }) {
  const ctx = await requireContext();
  if (!["owner", "admin"].includes(ctx.role)) throw new Error("Sem permissao");
  const supabase = await createClient();
  const { error } = await supabase.from("lead_intake_keys").insert({
    tenant_id: ctx.tenantId,
    name: input.name,
    source_label: input.source_label || "web",
  });
  if (error) throw new Error(error.message);
  revalidatePath("/integrations/forms");
}

export async function toggleIntakeKey(id: string, active: boolean) {
  const ctx = await requireContext();
  const supabase = await createClient();
  await supabase
    .from("lead_intake_keys")
    .update({ is_active: active })
    .eq("id", id)
    .eq("tenant_id", ctx.tenantId);
  revalidatePath("/integrations/forms");
}

export async function deleteIntakeKey(id: string) {
  const ctx = await requireContext();
  const supabase = await createClient();
  await supabase
    .from("lead_intake_keys")
    .delete()
    .eq("id", id)
    .eq("tenant_id", ctx.tenantId);
  revalidatePath("/integrations/forms");
}

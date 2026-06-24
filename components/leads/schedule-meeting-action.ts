"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertRole, canOperateLead } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { requireContext } from "@/lib/tenant";

const uuid = z.string().uuid();

export async function createAppointmentForLead(formData: FormData) {
  const ctx = await requireContext();
  assertRole(ctx.role, canOperateLead);

  const parsed = z
    .object({
      lead_id: uuid,
      professional_id: uuid.optional(),
      service_id: uuid.optional(),
      starts_at: z.string().min(1),
      duration_minutes: z.number().int().positive(),
      notes: z.string().optional(),
    })
    .parse({
      lead_id: formData.get("lead_id"),
      professional_id: formData.get("professional_id") || undefined,
      service_id: formData.get("service_id") || undefined,
      starts_at: formData.get("starts_at"),
      duration_minutes: Number(formData.get("duration_minutes") ?? 60),
      notes: formData.get("notes") || undefined,
    });

  const supabase = await createClient();
  const { error } = await supabase.from("appointments").insert({
    tenant_id: ctx.tenantId,
    lead_id: parsed.lead_id,
    professional_id: parsed.professional_id ?? null,
    service_id: parsed.service_id ?? null,
    starts_at: new Date(parsed.starts_at).toISOString(),
    duration_minutes: parsed.duration_minutes,
    notes: parsed.notes?.trim() || null,
    created_by: ctx.userId,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/agenda");
  revalidatePath("/reunioes");
  revalidatePath("/dashboard");
}

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { displayLeadName } from "@/lib/leads/display";
import { attachWhatsAppLidToLead, findLeadByContact } from "@/lib/leads/find-by-contact";

type SB = SupabaseClient<Database>;

export async function findOrCreateWhatsAppLead(
  supabase: SB,
  tenantId: string,
  contact: {
    phone?: string | null;
    lid?: string | null;
    name?: string | null;
    stageId?: string | null;
    pipelineId?: string | null;
  },
): Promise<string | null> {
  const existing = await findLeadByContact(supabase, tenantId, {
    phone: contact.phone,
    lid: contact.lid,
  });
  if (existing?.id) {
    if (contact.lid) {
      await attachWhatsAppLidToLead(supabase, existing.id, tenantId, contact.lid);
    }
    return existing.id;
  }

  const { data: created, error } = await supabase
    .from("leads")
    .insert({
      tenant_id: tenantId,
      name: displayLeadName(contact.name, contact.phone ?? contact.lid ?? ""),
      phone: contact.phone ?? null,
      whatsapp_lid: contact.lid ?? null,
      source: "whatsapp",
      stage_id: contact.stageId ?? null,
      pipeline_id: contact.pipelineId ?? null,
    })
    .select("id")
    .single();

  if (!error && created?.id) return created.id;

  const retry = await findLeadByContact(supabase, tenantId, {
    phone: contact.phone,
    lid: contact.lid,
  });
  if (retry?.id) {
    if (contact.lid) {
      await attachWhatsAppLidToLead(supabase, retry.id, tenantId, contact.lid);
    }
    return retry.id;
  }

  return null;
}

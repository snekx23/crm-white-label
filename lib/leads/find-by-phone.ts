import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { phoneMatchKeys, phonesEquivalent } from "@/lib/whatsapp/phone";

type SB = SupabaseClient<Database>;

export async function findLeadByPhone(
  supabase: SB,
  tenantId: string,
  rawPhone: string,
): Promise<{ id: string; phone: string | null } | null> {
  const keys = phoneMatchKeys(rawPhone);
  for (const key of keys) {
    const { data } = await supabase
      .from("leads")
      .select("id, phone")
      .eq("tenant_id", tenantId)
      .eq("phone", key)
      .maybeSingle();
    if (data) return data;
  }

  const { data: leads } = await supabase
    .from("leads")
    .select("id, phone")
    .eq("tenant_id", tenantId)
    .not("phone", "is", null)
    .limit(300);

  for (const lead of leads ?? []) {
    if (lead.phone && phonesEquivalent(rawPhone, lead.phone)) return lead;
  }

  return null;
}

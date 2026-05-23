import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import {
  shouldUpgradeMessageStatus,
  type DbMessageStatus,
  type ZapiMessageStatusUpdate,
} from "./zapi-status";

type ServiceClient = SupabaseClient<Database>;

export async function applyMessageStatusUpdates(
  supabase: ServiceClient,
  tenantId: string,
  updates: ZapiMessageStatusUpdate[],
): Promise<number> {
  let applied = 0;

  for (const update of updates) {
    for (const externalId of update.externalIds) {
      const { data: row } = await supabase
        .from("messages")
        .select("id, status")
        .eq("tenant_id", tenantId)
        .eq("external_id", externalId)
        .eq("direction", "outbound")
        .maybeSingle();

      if (!row) continue;

      const current = (row.status as DbMessageStatus | null) ?? "pending";
      if (!shouldUpgradeMessageStatus(current, update.status)) continue;

      await supabase.from("messages").update({ status: update.status }).eq("id", row.id);
      applied++;
    }
  }

  return applied;
}

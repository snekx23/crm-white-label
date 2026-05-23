"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireContext } from "@/lib/tenant";

export async function markNotificationRead(id: string) {
  const ctx = await requireContext();
  const supabase = await createClient();
  await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", id)
    .eq("tenant_id", ctx.tenantId);
  revalidatePath("/", "layout");
}

export async function markAllNotificationsRead() {
  const ctx = await requireContext();
  const supabase = await createClient();
  await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("tenant_id", ctx.tenantId)
    .eq("is_read", false);
  revalidatePath("/", "layout");
}

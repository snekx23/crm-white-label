import type { SupabaseClient } from "@supabase/supabase-js";

export async function processPostSalesReminders(supabase: SupabaseClient): Promise<number> {
  const now = Date.now();
  // 3 days window: between 2.5 days (60 hours) and 3.5 days (84 hours)
  const startHorizon = new Date(now + 2.5 * 24 * 60 * 60 * 1000).toISOString();
  const endHorizon = new Date(now + 3.5 * 24 * 60 * 60 * 1000).toISOString();

  // Fetch appointments that are scheduled/confirmed in the next 3 days window
  const { data: appts, error } = await supabase
    .from("appointments")
    .select("id, tenant_id, lead_id, starts_at, status, reminders_sent, leads(name)")
    .in("status", ["scheduled", "confirmed"])
    .gte("starts_at", startHorizon)
    .lte("starts_at", endHorizon);

  if (error) {
    console.error("[post-sales-reminders] Error fetching appointments:", error);
    return 0;
  }

  let triggered = 0;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const webhookUrl = `${appUrl.replace(/\/$/, "")}/api/webhooks/post-sales-reminder`;

  for (const appt of appts ?? []) {
    const already = Array.isArray(appt.reminders_sent) ? appt.reminders_sent : [];
    if (already.includes("3d_empenho")) {
      continue;
    }

    const leadName = (appt.leads as { name?: string | null } | null)?.name || "Cliente";
    const notificationMessage = `⚠️ Atenção: Faltam 3 dias para o show de ${leadName}. Clique aqui para anexar o documento de Empenho.`;

    // 1. Dispatch Webhook
    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.CRON_SECRET || ""}`,
        },
        body: JSON.stringify({
          event: "appointment.3d_before_show",
          timestamp: new Date().toISOString(),
          data: {
            lead_id: appt.lead_id,
            lead_name: leadName,
            tenant_id: appt.tenant_id,
            starts_at: appt.starts_at,
            notification_message: notificationMessage,
          },
        }),
      });

      if (!response.ok) {
        console.error(
          `[post-sales-reminders] Webhook returned status ${response.status} for appointment ${appt.id}`
        );
        // Continue anyway to try to notify next time or mark if needed,
        // but we'll only mark as sent if the webhook call succeeded or returned 2xx.
        if (response.status !== 200 && response.status !== 201) {
          continue;
        }
      }

      // 2. Mark reminders_sent
      const { error: updateError } = await supabase
        .from("appointments")
        .update({
          reminders_sent: [...already, "3d_empenho"],
        })
        .eq("id", appt.id);

      if (updateError) {
        console.error(
          `[post-sales-reminders] Failed to update reminders_sent for appointment ${appt.id}:`,
          updateError
        );
      } else {
        triggered++;
      }
    } catch (fetchErr) {
      console.error(
        `[post-sales-reminders] Network error invoking webhook for appointment ${appt.id}:`,
        fetchErr
      );
    }
  }

  return triggered;
}

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  // 1. Authorization Check
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = await req.json();
    const { event, data } = payload;

    if (event !== "appointment.3d_before_show" || !data) {
      return NextResponse.json({ error: "Invalid payload or event type" }, { status: 400 });
    }

    const { lead_id, lead_name, tenant_id, starts_at, notification_message } = data;
    if (!lead_id || !tenant_id) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = createServiceClient();

    // 2. Fetch tenant members (owners, admins)
    const { data: members, error: membersError } = await supabase
      .from("tenant_members")
      .select("user_id, role")
      .eq("tenant_id", tenant_id);

    if (membersError) {
      console.error("[post-sales-webhook] Error fetching tenant members:", membersError);
    }

    // 3. Fetch lead owner/assigned seller
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("assigned_to")
      .eq("id", lead_id)
      .single();

    if (leadError) {
      console.error("[post-sales-webhook] Error fetching lead owner:", leadError);
    }

    // 4. Compile unique user IDs to receive the visual notification alert
    const targetUserIds = new Set<string>();
    if (lead?.assigned_to) {
      targetUserIds.add(lead.assigned_to);
    }
    for (const m of members ?? []) {
      if (m.role === "owner" || m.role === "admin") {
        targetUserIds.add(m.user_id);
      }
    }

    // 5. Insert notification for each target user
    const insertedCount = targetUserIds.size;
    for (const userId of targetUserIds) {
      const { error: insertError } = await supabase
        .from("notifications")
        .insert({
          tenant_id,
          user_id: userId,
          kind: "empenho_reminder",
          title: "⚠️ Cobrança de Empenho",
          description: notification_message,
          link: `/leads/${lead_id}`,
          is_read: false,
        });

      if (insertError) {
        console.error(`[post-sales-webhook] Failed to insert notification for user ${userId}:`, insertError);
      }
    }

    // Log Activity on Lead
    await supabase.from("lead_activities").insert({
      tenant_id,
      lead_id,
      kind: "automation",
      payload: {
        message: `Disparo de lembrete de Empenho de 3 dias enviado via Webhook. Notificação gerada para os administradores.`,
      },
    });

    return NextResponse.json({
      ok: true,
      notificationsCreated: insertedCount,
    });
  } catch (err) {
    console.error("[post-sales-webhook] Critical error in webhook handler:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

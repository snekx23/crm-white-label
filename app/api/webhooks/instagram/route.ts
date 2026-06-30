import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { findOrCreateInstagramLead } from "@/lib/instagram/find-or-create";

export const dynamic = "force-dynamic";

// Meta webhook verification (GET)
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

type InstagramMessagingEntry = {
  sender: { id: string };
  recipient: { id: string };
  timestamp: number;
  message?: {
    mid: string;
    text?: string;
    attachments?: Array<{ type: string; payload: { url?: string } }>;
  };
};

type InstagramWebhookPayload = {
  object: string;
  entry: Array<{
    id: string;
    time: number;
    messaging: InstagramMessagingEntry[];
  }>;
};

export async function POST(req: NextRequest) {
  const payload = (await req.json()) as InstagramWebhookPayload;

  if (payload.object !== "instagram") {
    return NextResponse.json({ ok: false, reason: "not instagram" }, { status: 200 });
  }

  const supabase = createServiceClient();

  for (const entry of payload.entry ?? []) {
    const pageId = entry.id;

    const { data: account } = await supabase
      .from("instagram_accounts")
      .select("*")
      .eq("page_id", pageId)
      .eq("is_active", true)
      .maybeSingle();

    if (!account) continue;

    const tenantId = account.tenant_id as string;

    for (const event of entry.messaging ?? []) {
      if (!event.message) continue;

      const senderId = event.sender.id;
      const externalId = event.message.mid;
      const body = event.message.text ?? null;
      const attachment = event.message.attachments?.[0];
      const mediaUrl = attachment?.payload?.url ?? null;
      const mediaType = attachment?.type ?? null;
      const messageAt = new Date(event.timestamp).toISOString();

      // Deduplicate
      const { data: existing } = await supabase
        .from("messages")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("external_id", externalId)
        .maybeSingle();

      if (existing) continue;

      // Find default pipeline and resolve Instagram stage dynamically
      const { data: pipeline } = await supabase
        .from("pipelines")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("is_default", true)
        .single();

      const pipelineId = pipeline?.id;
      let targetStageId: string | undefined = undefined;

      if (pipelineId) {
        const { data: currentStages } = await supabase
          .from("pipeline_stages")
          .select("id, name, position")
          .eq("tenant_id", tenantId)
          .eq("pipeline_id", pipelineId)
          .order("position");

        const instaStage = currentStages?.find((s) => s.name === "Novos Leads (Instagram)");
        if (instaStage) {
          targetStageId = instaStage.id;
        } else {
          const minPos = currentStages && currentStages.length > 0
            ? Math.min(...currentStages.map((s) => s.position))
            : 0;
          const newPos = minPos - 1000;

          const { data: newStage, error: insertStageErr } = await supabase
            .from("pipeline_stages")
            .insert({
              tenant_id: tenantId,
              pipeline_id: pipelineId,
              name: "Novos Leads (Instagram)",
              position: newPos,
              color: "#c084fc",
              is_won: false,
              is_lost: false,
            })
            .select("id")
            .single();

          if (insertStageErr) {
            console.error("[instagram-webhook] Failed to auto-create Instagram stage:", insertStageErr);
            targetStageId = currentStages?.[0]?.id;
          } else {
            targetStageId = newStage?.id;
          }
        }
      }

      const leadId = await findOrCreateInstagramLead(supabase, tenantId, {
        senderId,
        stageId: targetStageId,
        pipelineId: pipelineId,
        notes: body,
      });

      if (!leadId) continue;

      // Upsert conversation
      const { data: existingConv } = await supabase
        .from("conversations")
        .select("id, unread_count")
        .eq("tenant_id", tenantId)
        .eq("lead_id", leadId)
        .eq("channel", "instagram")
        .maybeSingle();

      let conversationId = existingConv?.id as string | undefined;

      if (!conversationId) {
        const { data: created } = await supabase
          .from("conversations")
          .insert({
            tenant_id: tenantId,
            lead_id: leadId,
            channel: "instagram",
            last_message_at: messageAt,
            unread_count: 1,
          })
          .select("id")
          .single();
        conversationId = created?.id;
      } else {
        const unread = (existingConv as { unread_count?: number }).unread_count ?? 0;
        await supabase
          .from("conversations")
          .update({ last_message_at: messageAt, unread_count: unread + 1 })
          .eq("id", conversationId);
      }

      if (!conversationId) continue;

      await supabase.from("messages").insert({
        tenant_id: tenantId,
        conversation_id: conversationId,
        direction: "inbound",
        body,
        media_url: mediaUrl,
        media_type: mediaType,
        external_id: externalId,
        status: "delivered",
        created_at: messageAt,
      });
    }
  }

  return NextResponse.json({ ok: true });
}

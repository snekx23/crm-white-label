"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireContext } from "@/lib/tenant";
import { createProvider } from "@/lib/whatsapp/factory";
import { normalizeWhatsAppPhone } from "@/lib/whatsapp/phone";
import { renderMessageTemplate } from "@/lib/disparos/template";
import type { Campaign, WhatsAppAccount } from "@/lib/supabase/database.types";

const MAX_PER_REQUEST = 50;
const MAX_DELAY_MS = 10_000;

export type BulkSendResult = {
  campaign_id: string | null;
  total: number;
  processed: number;
  sent: number;
  failed: number;
  skipped: number;
  delay_ms: number;
  errors: string[];
};

export type MessageTemplateItem = {
  id: string;
  name: string;
  body: string;
};

export type AudiencePreview = {
  total: number;
  withPhone: number;
  sample: { id: string; name: string; phone: string; source: string | null }[];
  sources: string[];
};

export type CampaignListItem = Campaign & {
  stats?: { sent: number; failed: number; skipped: number; pending: number };
};

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function clampSendOptions(input: { delay_ms?: number; max_per_run?: number }) {
  const delay = Number.isFinite(input.delay_ms) ? Math.max(0, Math.floor(input.delay_ms ?? 0)) : 0;
  const max = Number.isFinite(input.max_per_run)
    ? Math.max(1, Math.min(MAX_PER_REQUEST, Math.floor(input.max_per_run ?? MAX_PER_REQUEST)))
    : MAX_PER_REQUEST;
  return {
    delay_ms: Math.min(delay, MAX_DELAY_MS),
    max_per_run: max,
  };
}

function buildLeadsQuery(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string,
  stageIds: string[],
  sources: string[],
) {
  let q = supabase
    .from("leads")
    .select("id, phone, name, email, source")
    .eq("tenant_id", tenantId);

  if (stageIds.length > 0) q = q.in("stage_id", stageIds);
  if (sources.length > 0) q = q.in("source", sources);

  return q;
}

function filterEligible<T extends { phone: string | null }>(leads: T[]): T[] {
  return leads.filter((l) => {
    const digits = l.phone?.replace(/\D/g, "") ?? "";
    return digits.length >= 10;
  });
}

export async function previewDisparoAudience(input: {
  stage_ids: string[];
  sources?: string[];
}): Promise<AudiencePreview> {
  const ctx = await requireContext();
  const supabase = await createClient();
  const sources = input.sources?.filter(Boolean) ?? [];

  // 1. Query para contagem total (HEAD rápida, não baixa linhas)
  let totalQuery = supabase
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", ctx.tenantId);
  if (input.stage_ids.length > 0) totalQuery = totalQuery.in("stage_id", input.stage_ids);
  if (sources.length > 0) totalQuery = totalQuery.in("source", sources);

  // 2. Query para contagem de qualificados com telefone (HEAD rápida)
  let phoneQuery = supabase
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", ctx.tenantId)
    .not("phone", "is", null)
    .neq("phone", "");
  if (input.stage_ids.length > 0) phoneQuery = phoneQuery.in("stage_id", input.stage_ids);
  if (sources.length > 0) phoneQuery = phoneQuery.in("source", sources);

  // 3. Query para amostra (máx 5 leads rápidos)
  let sampleQuery = supabase
    .from("leads")
    .select("id, name, phone, source")
    .eq("tenant_id", ctx.tenantId)
    .not("phone", "is", null)
    .neq("phone", "")
    .limit(5);
  if (input.stage_ids.length > 0) sampleQuery = sampleQuery.in("stage_id", input.stage_ids);
  if (sources.length > 0) sampleQuery = sampleQuery.in("source", sources);

  // 4. Query para buscar apenas a coluna de origem (economiza banda)
  let sourcesQuery = supabase
    .from("leads")
    .select("source")
    .eq("tenant_id", ctx.tenantId)
    .not("source", "is", null)
    .neq("source", "");
  if (input.stage_ids.length > 0) sourcesQuery = sourcesQuery.in("stage_id", input.stage_ids);

  // Executar todas em paralelo com alta velocidade!
  const [totalRes, phoneRes, sampleRes, sourcesRes] = await Promise.all([
    totalQuery,
    phoneQuery,
    sampleQuery,
    sourcesQuery,
  ]);

  if (totalRes.error) throw new Error(totalRes.error.message);
  if (phoneRes.error) throw new Error(phoneRes.error.message);
  if (sampleRes.error) throw new Error(sampleRes.error.message);
  if (sourcesRes.error) throw new Error(sourcesRes.error.message);

  const sourceSet = new Set<string>();
  for (const item of sourcesRes.data ?? []) {
    if (item.source?.trim()) sourceSet.add(item.source.trim());
  }

  const eligibleSample = filterEligible(sampleRes.data ?? []);

  return {
    total: totalRes.count ?? 0,
    withPhone: phoneRes.count ?? 0,
    sample: eligibleSample.map((l) => ({
      id: l.id,
      name: l.name,
      phone: l.phone ?? "",
      source: l.source,
    })),
    sources: [...sourceSet].sort(),
  };
}

export async function listCampaigns(limit = 12): Promise<CampaignListItem[]> {
  const ctx = await requireContext();
  const supabase = await createClient();

  const { data: campaigns, error } = await supabase
    .from("campaigns")
    .select("*")
    .eq("tenant_id", ctx.tenantId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  if (!campaigns?.length) return [];

  const ids = campaigns.map((c) => c.id);
  const { data: recipients } = await supabase
    .from("campaign_recipients")
    .select("campaign_id, status")
    .in("campaign_id", ids);

  const statsMap = new Map<string, { sent: number; failed: number; skipped: number; pending: number }>();
  for (const r of recipients ?? []) {
    const s = statsMap.get(r.campaign_id) ?? { sent: 0, failed: 0, skipped: 0, pending: 0 };
    if (r.status === "sent") s.sent += 1;
    else if (r.status === "failed") s.failed += 1;
    else if (r.status === "skipped") s.skipped += 1;
    else s.pending += 1;
    statsMap.set(r.campaign_id, s);
  }

  return campaigns.map((c) => ({
    ...(c as Campaign),
    stats: statsMap.get(c.id),
  }));
}

export async function sendBulkMessages(input: {
  campaign_name?: string;
  stage_ids: string[];
  sources?: string[];
  body?: string;
  template_id?: string | null;
  delay_ms?: number;
  max_per_run?: number;
}): Promise<BulkSendResult> {
  const ctx = await requireContext();
  const supabase = await createClient();
  const { delay_ms, max_per_run } = clampSendOptions(input);
  const sources = input.sources?.filter(Boolean) ?? [];

  let bodyTemplate = input.body?.trim() ?? "";
  if (input.template_id) {
    const { data: template, error: templateErr } = await supabase
      .from("message_templates")
      .select("id, payload")
      .eq("tenant_id", ctx.tenantId)
      .eq("id", input.template_id)
      .maybeSingle();
    if (templateErr) throw new Error(templateErr.message);
    const payloadBody =
      template?.payload && typeof template.payload.body === "string" ? template.payload.body : "";
    bodyTemplate = payloadBody.trim();
  }

  if (!bodyTemplate) throw new Error("Digite a mensagem do disparo");

  const { data: account } = await supabase
    .from("whatsapp_accounts")
    .select("*")
    .eq("tenant_id", ctx.tenantId)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (!account) {
    throw new Error("Configure uma conta WhatsApp ativa em Integrações → WhatsApp");
  }

  const { data: leads, error } = await buildLeadsQuery(
    supabase,
    ctx.tenantId,
    input.stage_ids,
    sources,
  );
  if (error) throw new Error(error.message);

  const eligible = filterEligible(leads ?? []);
  const batch = eligible.slice(0, max_per_run);

  const campaignName =
    input.campaign_name?.trim() ||
    `Disparo ${new Date().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}`;

  const { data: campaign, error: campErr } = await supabase
    .from("campaigns")
    .insert({
      tenant_id: ctx.tenantId,
      name: campaignName,
      status: "running",
      message_mode: input.template_id ? "template" : "text",
      template_id: input.template_id ?? null,
      body_text: bodyTemplate,
      filters: { stage_ids: input.stage_ids, sources, delay_ms, max_per_run },
      started_at: new Date().toISOString(),
      max_per_run,
      created_by: ctx.userId,
    })
    .select("id")
    .single();

  if (campErr) throw new Error(campErr.message);
  const campaignId = campaign.id;

  if (batch.length > 0) {
    await supabase.from("campaign_recipients").insert(
      batch.map((lead) => ({
        tenant_id: ctx.tenantId,
        campaign_id: campaignId,
        lead_id: lead.id,
        phone: lead.phone!,
        status: "pending" as const,
      })),
    );
  }

  const provider = createProvider(account as WhatsAppAccount);
  let sent = 0;
  let failed = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const [index, lead] of batch.entries()) {
    const phone = normalizeWhatsAppPhone(lead.phone!);
    const body = renderMessageTemplate(bodyTemplate, lead);

    if (phone.length < 12) {
      failed += 1;
      const errMsg = `${lead.name ?? lead.phone}: telefone inválido`;
      errors.push(errMsg);
      await supabase
        .from("campaign_recipients")
        .update({ status: "failed", error: errMsg })
        .eq("campaign_id", campaignId)
        .eq("lead_id", lead.id);
      continue;
    }

    if (account.provider === "cloud_api") {
      skipped += 1;
      const errMsg =
        "Cloud API exige template aprovado fora da janela de 24h — use Evolution/Z-API ou o chat individual.";
      errors.push(`${lead.name ?? phone}: ${errMsg}`);
      await supabase
        .from("campaign_recipients")
        .update({ status: "skipped", error: errMsg })
        .eq("campaign_id", campaignId)
        .eq("lead_id", lead.id);
      continue;
    }

    try {
      const result = await provider.send({ to: phone, body });
      if (result.status === "sent") {
        sent += 1;
        await logOutboundMessage(supabase, ctx.tenantId, ctx.userId, lead.id, account.id, body);
        await supabase
          .from("campaign_recipients")
          .update({ status: "sent", sent_at: new Date().toISOString(), error: null })
          .eq("campaign_id", campaignId)
          .eq("lead_id", lead.id);
      } else {
        failed += 1;
        const errMsg = "Falha no envio pelo provedor";
        errors.push(`${lead.name ?? phone}: ${errMsg}`);
        await supabase
          .from("campaign_recipients")
          .update({ status: "failed", error: errMsg })
          .eq("campaign_id", campaignId)
          .eq("lead_id", lead.id);
      }
    } catch (e) {
      failed += 1;
      const errMsg = (e as Error).message;
      errors.push(`${lead.name ?? phone}: ${errMsg}`);
      await supabase
        .from("campaign_recipients")
        .update({ status: "failed", error: errMsg })
        .eq("campaign_id", campaignId)
        .eq("lead_id", lead.id);
    }

    if (delay_ms > 0 && index < batch.length - 1) await wait(delay_ms);
  }

  const finalStatus =
    sent === 0 && failed > 0 && skipped === 0 ? "failed" : sent > 0 ? "completed" : "completed";

  await supabase
    .from("campaigns")
    .update({
      status: finalStatus,
      completed_at: new Date().toISOString(),
    })
    .eq("id", campaignId);

  revalidatePath("/disparos");
  revalidatePath("/chat");

  return {
    campaign_id: campaignId,
    total: eligible.length,
    processed: batch.length,
    sent,
    failed,
    skipped,
    delay_ms,
    errors: errors.slice(0, 12),
  };
}

export async function createMessageTemplate(input: {
  name: string;
  body: string;
}): Promise<MessageTemplateItem> {
  const ctx = await requireContext();
  const supabase = await createClient();
  const name = input.name.trim();
  const body = input.body.trim();

  if (!name) throw new Error("Nome do template é obrigatório");
  if (!body) throw new Error("Texto do template é obrigatório");

  const { data, error } = await supabase
    .from("message_templates")
    .insert({
      tenant_id: ctx.tenantId,
      name,
      channel: "whatsapp",
      payload: { body },
    })
    .select("id, name, payload")
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/disparos");

  return {
    id: data.id,
    name: data.name,
    body: typeof data.payload?.body === "string" ? data.payload.body : "",
  };
}

export async function deleteMessageTemplate(id: string) {
  const ctx = await requireContext();
  const supabase = await createClient();
  const { error } = await supabase
    .from("message_templates")
    .delete()
    .eq("tenant_id", ctx.tenantId)
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/disparos");
}

async function logOutboundMessage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string,
  userId: string,
  leadId: string,
  accountId: string,
  body: string,
) {
  const { data: conv } = await supabase
    .from("conversations")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("lead_id", leadId)
    .eq("channel", "whatsapp")
    .maybeSingle();

  let conversationId = conv?.id;
  if (!conversationId) {
    const { data: created } = await supabase
      .from("conversations")
      .insert({
        tenant_id: tenantId,
        lead_id: leadId,
        whatsapp_account_id: accountId,
        channel: "whatsapp",
        last_message_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    conversationId = created?.id;
  }
  if (!conversationId) return;

  await supabase.from("messages").insert({
    tenant_id: tenantId,
    conversation_id: conversationId,
    user_id: userId,
    direction: "outbound",
    body,
    status: "sent",
  });
  await supabase
    .from("conversations")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", conversationId);
}

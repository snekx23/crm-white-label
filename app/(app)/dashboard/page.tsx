import { createClient } from "@/lib/supabase/server";
import { requireContext } from "@/lib/tenant";
import { PageHeader } from "@/components/app/page-header";
import { LeadsOpsDashboard } from "@/components/dashboard/leads-ops-dashboard";
import { formatBRTDateLong, getBRTDayBounds, getBRTYesterdayBounds } from "@/lib/date/brt";
import {
  aggregateSources,
  buildLeadsByHour,
  buildWeekTrend,
  type LeadsDashboardData,
} from "@/lib/leads/dashboard-metrics";

export default async function DashboardPage() {
  const ctx = await requireContext();
  const supabase = await createClient();
  const today = getBRTDayBounds();
  const yesterday = getBRTYesterdayBounds();

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 6);
  const weekStartStr = weekStart.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });

  const [
    { data: leadsToday },
    { data: leadsYesterday },
    { data: leadsWeek },
    { data: allLeads },
    { data: stages },
    { data: wonStages },
    { count: messagesToday },
    { data: convosToday },
  ] = await Promise.all([
    supabase
      .from("leads")
      .select("id, name, phone, source, created_at, stage_id, value_cents")
      .eq("tenant_id", ctx.tenantId)
      .gte("created_at", today.startIso)
      .lte("created_at", today.endIso)
      .order("created_at", { ascending: false }),
    supabase
      .from("leads")
      .select("id")
      .eq("tenant_id", ctx.tenantId)
      .gte("created_at", yesterday.startIso)
      .lte("created_at", yesterday.endIso),
    supabase
      .from("leads")
      .select("created_at")
      .eq("tenant_id", ctx.tenantId)
      .gte("created_at", `${weekStartStr}T00:00:00-03:00`),
    supabase.from("leads").select("stage_id").eq("tenant_id", ctx.tenantId),
    supabase
      .from("pipeline_stages")
      .select("id, name, color, position, is_won, is_lost")
      .eq("tenant_id", ctx.tenantId)
      .order("position"),
    supabase.from("pipeline_stages").select("id").eq("tenant_id", ctx.tenantId).eq("is_won", true),
    supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", ctx.tenantId)
      .eq("direction", "outbound")
      .gte("created_at", today.startIso)
      .lte("created_at", today.endIso),
    supabase
      .from("conversations")
      .select("id")
      .eq("tenant_id", ctx.tenantId)
      .gte("last_message_at", today.startIso)
      .lte("last_message_at", today.endIso),
  ]);

  const wonIds = new Set((wonStages ?? []).map((s) => s.id));
  const stageMap = new Map((stages ?? []).map((s) => [s.id, s]));

  const pipelineByStage = (stages ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    color: s.color ?? "#94a3b8",
    count: (allLeads ?? []).filter((l) => l.stage_id === s.id).length,
    isWon: s.is_won,
    isLost: s.is_lost,
  }));

  const wonToday = (leadsToday ?? []).filter((l) => l.stage_id && wonIds.has(l.stage_id)).length;
  const pipelineValueTodayCents = (leadsToday ?? []).reduce((a, l) => a + (l.value_cents ?? 0), 0);

  const dashboardData: LeadsDashboardData = {
    dateLabel: formatBRTDateLong(),
    today: { startIso: today.startIso, endIso: today.endIso },
    kpis: {
      newLeadsToday: leadsToday?.length ?? 0,
      newLeadsYesterday: leadsYesterday?.length ?? 0,
      outboundMessagesToday: messagesToday ?? 0,
      activeConversationsToday: convosToday?.length ?? 0,
      wonToday,
      pipelineValueTodayCents,
    },
    leadsByHour: buildLeadsByHour(leadsToday ?? [], today.startIso),
    pipelineByStage,
    sourcesToday: aggregateSources(leadsToday ?? []),
    recentToday: (leadsToday ?? []).map((l) => {
      const stage = stageMap.get(l.stage_id ?? "");
      return {
        id: l.id,
        name: l.name,
        phone: l.phone,
        source: l.source,
        created_at: l.created_at,
        stageName: stage?.name ?? null,
        stageColor: stage?.color ?? null,
        value_cents: l.value_cents,
      };
    }),
    weekTrend: buildWeekTrend(leadsWeek ?? []),
  };

  return (
    <div>
      <PageHeader
        eyebrow="Leads"
        title="Central de operações"
        description="Painel diário para acompanhar entradas, conversas e desempenho comercial."
      />
      <LeadsOpsDashboard data={dashboardData} />
    </div>
  );
}

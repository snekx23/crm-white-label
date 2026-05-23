import { createClient } from "@/lib/supabase/server";
import { requireContext } from "@/lib/tenant";
import { PageHeader } from "@/components/app/page-header";
import { KanbanBoard } from "./kanban-board";

export default async function KanbanPage() {
  const ctx = await requireContext();
  const supabase = await createClient();

  const [{ data: stages }, { data: leads }] = await Promise.all([
    supabase
      .from("pipeline_stages")
      .select("id, name, color, position")
      .eq("tenant_id", ctx.tenantId)
      .order("position"),
    supabase
      .from("leads")
      .select("id, name, phone, value_cents, stage_id, position, source")
      .eq("tenant_id", ctx.tenantId)
      .order("position"),
  ]);

  return (
    <div className="flex h-screen flex-col">
      <PageHeader eyebrow="Pipeline" title="Kanban" description="Arraste os leads entre os estagios" />
      <div className="flex-1 overflow-hidden p-6">
        <KanbanBoard initialStages={stages ?? []} initialLeads={leads ?? []} />
      </div>
    </div>
  );
}

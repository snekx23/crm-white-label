import { createClient } from "@/lib/supabase/server";
import { requireContext } from "@/lib/tenant";
import { PageHeader } from "@/components/app/page-header";
import { DisparosClient } from "./disparos-client";

export const dynamic = "force-dynamic";

export default async function DisparosPage() {
  const ctx = await requireContext();
  const supabase = await createClient();

  // Fetch unique tags in the leads table for this tenant
  const { data: leads } = await supabase
    .from("leads")
    .select("tags")
    .eq("tenant_id", ctx.tenantId);

  const tagsSet = new Set<string>();

  // Add default tag placeholders to be helpful if no tags are registered yet
  const defaults = ["Prefeitura", "Clube", "Baile", "Contato Inicial", "Frio"];
  defaults.forEach((t) => tagsSet.add(t));

  leads?.forEach((l) => {
    l.tags?.forEach((t) => {
      if (t && t.trim()) {
        tagsSet.add(t.trim());
      }
    });
  });

  const sortedTags = Array.from(tagsSet).sort();

  return (
    <div className="flex h-screen flex-col">
      <PageHeader 
        eyebrow="Marketing" 
        title="Disparo em Massa" 
        description="Comunicação simplificada via WhatsApp para contatos segmentados" 
      />
      <div className="flex-1 overflow-auto p-6 bg-slate-50/50">
        <DisparosClient uniqueTags={sortedTags} tenantId={ctx.tenantId} />
      </div>
    </div>
  );
}

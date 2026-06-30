import { createServiceClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { FormContainer } from "./form-container";

export const dynamic = "force-dynamic";

export default async function PublicPostSalesFormPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createServiceClient();

  // Fetch the lead using service client to bypass RLS for public access
  const { data: lead } = await supabase
    .from("leads")
    .select("id, name")
    .eq("id", id)
    .maybeSingle();

  if (!lead) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="bg-emerald-600 px-6 py-8 text-center text-white">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/20 mb-3 border border-emerald-400/30">
            <span className="text-3xl">🎺</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Super Banda Choppão</h1>
          <p className="mt-2 text-emerald-100 text-base md:text-lg">
            Formulário de Logística do Show
          </p>
        </div>

        {/* Form Content */}
        <div className="p-6 md:p-8">
          <div className="mb-6 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
            <p className="text-slate-700 text-base">
              Olá, <strong className="text-emerald-800">{lead.name}</strong>! Por favor, preencha os dados logísticos abaixo para que possamos organizar a melhor experiência para o seu show.
            </p>
          </div>

          <FormContainer leadId={lead.id} />
        </div>
      </div>
    </div>
  );
}

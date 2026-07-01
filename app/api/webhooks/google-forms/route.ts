import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      leadId,
      contratanteRazao,
      contratanteCnpjCpf,
      contratanteIe,
      contratanteTelefone,
      responsavelNome,
      responsavelCpf,
      responsavelCargo,
      responsavelTelefone,
      responsavelEmail,
      logisticaEndereco,
      logisticaHorarioShow,
      logisticaHorarioSom,
      logisticaCamarim,
      logisticaContatoLocal,
      dadosRadio,
      documentoUrl,
    } = body;

    if (!leadId) {
      return NextResponse.json({ error: "Missing required parameter 'leadId'" }, { status: 400 });
    }

    const supabase = createServiceClient();

    // 1. Fetch lead details to get tenant_id and verify existence
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("tenant_id, custom_fields")
      .eq("id", leadId)
      .single();

    if (leadError || !lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const tenantId = lead.tenant_id;

    // 2. Insert or update contract row in lead_contracts
    const { error: contractError } = await supabase
      .from("lead_contracts")
      .upsert(
        {
          tenant_id: tenantId,
          lead_id: leadId,
          contratante_razao: contratanteRazao || null,
          contratante_cnpj_cpf: contratanteCnpjCpf || null,
          contratante_ie: contratanteIe || null,
          contratante_telefone: contratanteTelefone || null,
          responsavel_nome: responsavelNome || null,
          responsavel_cpf: responsavelCpf || null,
          responsavel_cargo: responsavelCargo || null,
          responsavel_telefone: responsavelTelefone || null,
          responsavel_email: responsavelEmail || null,
          logistica_endereco: logisticaEndereco || null,
          logistica_horario_show: logisticaHorarioShow || null,
          logistica_horario_som: logisticaHorarioSom || null,
          logistica_camarim: logisticaCamarim || null,
          logistica_contato_local: logisticaContatoLocal || null,
          dados_radio: dadosRadio || null,
          documento_url: documentoUrl || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "lead_id" } // Upsert based on lead_id mapping
      );

    if (contractError) {
      console.error("[google-forms-webhook] Database error writing contract:", contractError);
      return NextResponse.json({ error: contractError.message }, { status: 500 });
    }

    // 3. Update lead's custom_fields to maintain backwards compatibility with other panels
    const currentFields = (lead.custom_fields as Record<string, unknown>) || {};
    const updatedFields = {
      ...currentFields,
      horario_show: logisticaHorarioShow || currentFields.horario_show,
      endereco_show: logisticaEndereco || currentFields.endereco_show,
      rider_tecnico: dadosRadio || currentFields.rider_tecnico,
      faturamento_cnpj: contratanteCnpjCpf || currentFields.faturamento_cnpj,
      faturamento_razao: contratanteRazao || currentFields.faturamento_razao,
      logistics_submitted: true,
      logistics_submitted_at: new Date().toISOString(),
    };

    const { error: leadUpdateError } = await supabase
      .from("leads")
      .update({ custom_fields: updatedFields })
      .eq("id", leadId);

    if (leadUpdateError) {
      console.warn("[google-forms-webhook] Warning, failed to update lead custom_fields:", leadUpdateError);
    }

    // 4. Log lead activity
    await supabase.from("lead_activities").insert({
      tenant_id: tenantId,
      lead_id: leadId,
      kind: "automation",
      payload: {
        message: `Formulário de Contrato do Google Forms preenchido pelo cliente: "${contratanteRazao || "Sem nome"}". Dados importados automaticamente para o CRM.`,
      },
    });

    // 5. Create confirmation task for owner
    await supabase.from("tasks").insert({
      tenant_id: tenantId,
      lead_id: leadId,
      title: `Google Forms respondido! Confirmar dados de faturamento e logística do show.`,
      status: "open",
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[google-forms-webhook] Critical webhook error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

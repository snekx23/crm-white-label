"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function submitLogisticsForm(
  leadId: string,
  data: {
    showTime: string;
    address: string;
    technicalRider: string;
    billingCnpj: string;
    billingName: string;
  }
) {
  try {
    const supabase = createServiceClient();

    // 1. Fetch current lead custom_fields
    const { data: lead, error: getError } = await supabase
      .from("leads")
      .select("tenant_id, name, custom_fields")
      .eq("id", leadId)
      .single();

    if (getError || !lead) {
      throw new Error("Lead não encontrado");
    }

    const tenantId = lead.tenant_id;
    const currentFields = (lead.custom_fields as Record<string, unknown>) || {};

    const updatedFields = {
      ...currentFields,
      horario_show: data.showTime,
      endereco_show: data.address,
      rider_tecnico: data.technicalRider,
      faturamento_cnpj: data.billingCnpj,
      faturamento_razao: data.billingName,
      logistics_submitted: true,
      logistics_submitted_at: new Date().toISOString(),
    };

    // 2. Update custom fields on Lead
    const { error: updateError } = await supabase
      .from("leads")
      .update({ custom_fields: updatedFields })
      .eq("id", leadId);

    if (updateError) {
      throw new Error(updateError.message);
    }

    // 3. Log lead activity
    await supabase.from("lead_activities").insert({
      tenant_id: tenantId,
      lead_id: leadId,
      kind: "automation",
      payload: { message: "O cliente preencheu as informações do Formulário de Logística Pós-Venda." },
    });

    // 4. Create check task
    await supabase.from("tasks").insert({
      tenant_id: tenantId,
      lead_id: leadId,
      title: `Logística respondida! Confirmar horário (${data.showTime}) e rider técnico.`,
      status: "open",
    });

    revalidatePath("/leads");
    revalidatePath(`/leads/${leadId}`);
    return { success: true };
  } catch (err) {
    console.error("[post-sales-form] Error submitting form:", err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

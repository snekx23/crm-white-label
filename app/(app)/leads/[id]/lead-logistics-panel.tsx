"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, MapPin, ClipboardList, CreditCard, Link2, CheckCircle } from "lucide-react";

export function LeadLogisticsPanel({
  leadId,
  customFields,
}: {
  leadId: string;
  customFields: Record<string, any>;
}) {
  const [copied, setCopied] = useState(false);

  const showTime = customFields?.horario_show;
  const address = customFields?.endereco_show;
  const technicalRider = customFields?.rider_tecnico;
  const billingCnpj = customFields?.faturamento_cnpj;
  const billingName = customFields?.faturamento_razao;
  const submitted = customFields?.logistics_submitted === true;

  const googleFormUrl = process.env.NEXT_PUBLIC_GOOGLE_FORM_URL || "https://forms.gle/fEM6bsw3ajeyRDmg7";
  const formUrl = googleFormUrl.includes("?")
    ? `${googleFormUrl}&entry.leadId=${leadId}`
    : `${googleFormUrl}?entry.leadId=${leadId}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(formUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy link:", err);
    }
  }

  return (
    <Card className="border-2 border-slate-200">
      <CardHeader className="flex flex-row items-center justify-between pb-4 space-y-0">
        <CardTitle className="text-xl font-bold flex items-center gap-2">
          🚚 Logística & Faturamento
        </CardTitle>
        <Badge className={`text-base py-1 px-3 ${submitted ? "bg-emerald-600 hover:bg-emerald-600 text-white" : "bg-amber-500 hover:bg-amber-500 text-white"}`}>
          {submitted ? "Logística Recebida" : "Aguardando Resposta"}
        </Badge>
      </CardHeader>

      <CardContent className="space-y-5">
        {submitted ? (
          <div className="space-y-4">
            {/* Show Time */}
            <div className="flex gap-3">
              <Clock className="h-6 w-6 text-slate-500 shrink-0 mt-0.5" />
              <div>
                <span className="block text-sm font-semibold uppercase text-muted-foreground">Horário do Show</span>
                <span className="text-lg font-medium text-slate-800">{showTime || "-"}</span>
              </div>
            </div>

            {/* Address */}
            <div className="flex gap-3">
              <MapPin className="h-6 w-6 text-slate-500 shrink-0 mt-0.5" />
              <div>
                <span className="block text-sm font-semibold uppercase text-muted-foreground">Local / Endereço</span>
                <span className="text-lg font-medium text-slate-800">{address || "-"}</span>
              </div>
            </div>

            {/* Technical Rider */}
            <div className="flex gap-3">
              <ClipboardList className="h-6 w-6 text-slate-500 shrink-0 mt-0.5" />
              <div>
                <span className="block text-sm font-semibold uppercase text-muted-foreground">Rider Técnico & Obs</span>
                <p className="text-base text-slate-700 whitespace-pre-wrap mt-0.5">{technicalRider || "Sem observações técnicas."}</p>
              </div>
            </div>

            {/* Billing */}
            <div className="border-t border-slate-100 pt-4 flex gap-3">
              <CreditCard className="h-6 w-6 text-slate-500 shrink-0 mt-0.5" />
              <div className="w-full">
                <span className="block text-sm font-semibold uppercase text-muted-foreground">Faturamento</span>
                <div className="grid gap-2 md:grid-cols-2 mt-1 p-3 bg-slate-50 rounded-lg border text-base">
                  <div>
                    <span className="text-sm text-muted-foreground block">Razão Social / Nome</span>
                    <span className="font-semibold text-slate-800">{billingName || "-"}</span>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground block">CNPJ / CPF</span>
                    <span className="font-semibold text-slate-800 font-mono">{billingCnpj || "-"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-slate-50 rounded-xl border flex flex-col items-center text-center space-y-4">
            <span className="text-4xl animate-pulse">⏳</span>
            <div>
              <h4 className="font-bold text-lg text-slate-800">Formulário de Logística não respondido</h4>
              <p className="text-base text-muted-foreground max-w-sm mt-1">
                Envie o formulário de logística pós-venda para o cliente preencher os dados de faturamento e local.
              </p>
            </div>
          </div>
        )}

        {/* Copy Link Button */}
        <Button
          onClick={handleCopy}
          variant="outline"
          className="w-full text-base py-6 flex items-center justify-center gap-2 border-2"
        >
          {copied ? (
            <>
              <CheckCircle className="h-5 w-5 text-emerald-600" />
              Link Copiado!
            </>
          ) : (
            <>
              <Link2 className="h-5 w-5" />
              Copiar Link do Formulário
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

"use client";

import { useState, useTransition } from "react";
import { FileText, Download, Trash2, CheckCircle2, AlertTriangle, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { FileRow } from "@/lib/supabase/database.types";
import {
  getTenantStoragePath,
  persistLeadFile,
  deleteLeadFile,
  getSignedFileUrl,
} from "./file-actions";

export function LeadContractsPanel({ leadId, files }: { leadId: string; files: FileRow[] }) {
  const [pending, start] = useTransition();
  const [list, setList] = useState(files);

  const contractFiles = list.filter((f) => f.name.startsWith("[CONTRATO_EMPENHO]"));
  const hasDocuments = contractFiles.length > 0;

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Only allow PDFs for empenhos/contracts
    if (file.type !== "application/pdf") {
      alert("Por favor, selecione apenas arquivos em formato PDF.");
      return;
    }

    start(async () => {
      const supabase = createClient();
      const prefix = await getTenantStoragePath(leadId);
      
      // Rename file with contract/empenho prefix
      const prefixedName = `[CONTRATO_EMPENHO] - ${file.name}`;
      const path = `${prefix}/${crypto.randomUUID()}-${file.name}`;
      
      const { error } = await supabase.storage
        .from("lead-files")
        .upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });
      
      if (error) {
        alert(error.message);
        return;
      }
      
      const row = await persistLeadFile({
        leadId,
        name: prefixedName,
        storagePath: path,
        mimeType: file.type,
        sizeBytes: file.size,
      });
      
      setList((prev) => [row, ...prev]);
      e.target.value = "";
    });
  }

  async function onDelete(file: FileRow) {
    if (!confirm("Excluir este documento de empenho/contrato?")) return;
    start(async () => {
      await deleteLeadFile(file.id, file.storage_path);
      setList((prev) => prev.filter((f) => f.id !== file.id));
    });
  }

  async function onDownload(file: FileRow) {
    const url = await getSignedFileUrl(file.storage_path);
    if (url) window.open(url, "_blank");
  }

  return (
    <Card className={`border-2 ${hasDocuments ? "border-emerald-500 bg-emerald-50/10" : "border-amber-400 bg-amber-50/10"}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-xl font-bold flex items-center gap-2">
          📄 Contratos e Notas de Empenho
        </CardTitle>
        <Badge className={`text-base py-1 px-3 ${hasDocuments ? "bg-emerald-600 hover:bg-emerald-600 text-white" : "bg-amber-500 hover:bg-amber-500 text-white"}`}>
          {hasDocuments ? (
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4" /> Documento Recebido
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <AlertTriangle className="h-4 w-4" /> Pendente de Envio
            </span>
          )}
        </Badge>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Upload Box */}
        <label className={`flex flex-col items-center justify-center border-4 border-dashed rounded-2xl p-12 cursor-pointer transition-all hover:bg-emerald-50/20 group ${hasDocuments ? "border-emerald-500/40 bg-background hover:border-emerald-500" : "border-red-500/80 bg-red-50/10 hover:border-red-600"}`}>
          <input type="file" accept="application/pdf" className="hidden" onChange={onUpload} disabled={pending} />
          <Upload className={`h-16 w-16 mb-4 transition-colors ${pending ? "text-slate-400 animate-pulse" : hasDocuments ? "text-emerald-600/70 group-hover:text-emerald-600" : "text-red-500 group-hover:text-red-600"}`} />
          <span className={`text-2xl font-bold transition-colors ${hasDocuments ? "text-slate-800" : "text-red-600 group-hover:text-red-700"}`}>
            {pending ? "Enviando PDF..." : "Anexar Empenho"}
          </span>
          <span className="text-base text-muted-foreground mt-2 font-medium">
            Clique aqui para selecionar o arquivo PDF da nota de empenho
          </span>
        </label>

        {/* File List */}
        {contractFiles.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold text-slate-700">Documentos Anexados:</h4>
            <ul className="space-y-2">
              {contractFiles.map((f) => {
                // Stripping prefix for user friendly rendering
                const displayName = f.name.replace("[CONTRATO_EMPENHO] - ", "");
                return (
                  <li key={f.id} className="flex items-center justify-between rounded-lg border bg-background p-3 text-base shadow-sm">
                    <span className="flex items-center gap-2 truncate font-medium text-slate-800">
                      <FileText className="h-5 w-5 text-emerald-600 shrink-0" />
                      <span className="truncate">{displayName}</span>
                    </span>
                    <span className="flex gap-1 shrink-0">
                      <Button size="icon" variant="ghost" onClick={() => onDownload(f)} title="Baixar PDF">
                        <Download className="h-5 w-5 text-slate-600 hover:text-emerald-600" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => onDelete(f)} title="Excluir PDF">
                        <Trash2 className="h-5 w-5 text-slate-600 hover:text-red-600" />
                      </Button>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

"use client";

import { useState, useTransition } from "react";
import { 
  Megaphone, 
  Upload, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Users, 
  FileImage, 
  Trash2 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

export function DisparosClient({ 
  uniqueTags, 
  tenantId 
}: { 
  uniqueTags: string[]; 
  tenantId: string; 
}) {
  const [selectedTag, setSelectedTag] = useState(uniqueTags[0] || "");
  const [message, setMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  
  const [isUploading, setIsUploading] = useState(false);
  const [pending, start] = useTransition();

  // Execution states
  const [isSending, setIsSending] = useState(false);
  const [targets, setTargets] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [logs, setLogs] = useState<{ name: string; status: "pending" | "success" | "error" }[]>([]);
  const [completed, setCompleted] = useState(false);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;

    // Validate type (image or pdf)
    const validTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!validTypes.includes(selected.type)) {
      alert("Por favor, selecione apenas arquivos PDF ou Imagens (JPG, PNG, WEBP).");
      return;
    }

    setFile(selected);
    setIsUploading(true);

    try {
      const supabase = createClient();
      const path = `${tenantId}/campaigns/${crypto.randomUUID()}-${selected.name}`;
      
      const { error } = await supabase.storage
        .from("lead-files")
        .upload(path, selected, { cacheControl: "3600", upsert: false });

      if (error) {
        alert("Erro no envio do anexo: " + error.message);
        setFile(null);
        setIsUploading(false);
        return;
      }

      // Generate a signed URL valid for 30 days to ensure the media gateway can read it
      const { data } = await supabase.storage
        .from("lead-files")
        .createSignedUrl(path, 60 * 60 * 24 * 30);

      if (data?.signedUrl) {
        setFileUrl(data.signedUrl);
      } else {
        alert("Não foi possível gerar a URL de download da imagem.");
      }
    } catch (err) {
      console.error(err);
      alert("Falha no upload do anexo.");
    } finally {
      setIsUploading(false);
    }
  }

  function removeAttachment() {
    setFile(null);
    setFileUrl(null);
  }

  async function handleSendBulk() {
    if (!selectedTag) {
      alert("Por favor, selecione para quem enviar.");
      return;
    }
    if (!message.trim()) {
      alert("Por favor, digite uma mensagem para enviar.");
      return;
    }

    const confirmSend = confirm(
      `Deseja realmente iniciar o envio em massa para todos os contatos marcados como "${selectedTag}"?`
    );
    if (!confirmSend) return;

    setIsSending(true);
    setCompleted(false);
    setCurrentIndex(0);

    try {
      // 1. Fetch target leads
      const res = await fetch(`/api/disparos/targets?tag=${encodeURIComponent(selectedTag)}`);
      const data = await res.json();

      if (data.error) {
        alert("Erro ao buscar contatos: " + data.error);
        setIsSending(false);
        return;
      }

      const foundTargets = data.leads || [];
      if (foundTargets.length === 0) {
        alert(`Nenhum contato encontrado com a etiqueta "${selectedTag}" que possua telefone cadastrado.`);
        setIsSending(false);
        return;
      }

      setTargets(foundTargets);
      
      // Initialize logs list
      const initialLogs = foundTargets.map((t: any) => ({
        name: t.name,
        status: "pending" as const,
      }));
      setLogs(initialLogs);

      // 2. Loop through targets with a 3-second delay to avoid spam filters
      for (let i = 0; i < foundTargets.length; i++) {
        setCurrentIndex(i);
        const target = foundTargets[i];

        try {
          const sendRes = await fetch("/api/disparos/send-single", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              leadId: target.id,
              message: message,
              mediaUrl: fileUrl,
            }),
          });

          const sendData = await sendRes.json();
          
          setLogs((prev) => 
            prev.map((log, index) => 
              index === i 
                ? { ...log, status: sendRes.ok && sendData.success ? "success" : "error" } 
                : log
            )
          );
        } catch (err) {
          console.error("Error sending to lead:", target.id, err);
          setLogs((prev) => 
            prev.map((log, index) => index === i ? { ...log, status: "error" } : log)
          );
        }

        // Add delay (except for the last message)
        if (i < foundTargets.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 3000));
        }
      }

      setCompleted(true);
    } catch (err) {
      console.error(err);
      alert("Ocorreu um erro no processamento do disparo.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 p-6">
      {/* Campanha Config */}
      <Card className="border-2 border-slate-200 shadow-md">
        <CardHeader className="bg-slate-50 border-b p-6">
          <CardTitle className="text-3xl font-extrabold text-slate-800 flex items-center gap-3">
            <Megaphone className="h-9 w-9 text-brand" />
            Disparar Mensagem em Massa
          </CardTitle>
          <p className="text-slate-600 text-lg">
            Envie comunicados ou flyers de shows para múltiplos contatos de uma só vez de forma extremamente simples.
          </p>
        </CardHeader>

        <CardContent className="p-8 space-y-8">
          {/* Dropdown Select tag */}
          <div className="space-y-3">
            <label className="block text-2xl font-bold text-slate-800">
              1. Para quem enviar?
            </label>
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-slate-500" />
              <select
                disabled={isSending}
                value={selectedTag}
                onChange={(e) => setSelectedTag(e.target.value)}
                className="w-full text-2xl font-semibold p-4 rounded-xl border-2 border-slate-300 bg-background outline-none focus:border-brand transition-colors cursor-pointer"
              >
                {uniqueTags.map((tag) => (
                  <option key={tag} value={tag}>
                    Contatos com a etiqueta: "{tag}"
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Text Area input message */}
          <div className="space-y-3">
            <label className="block text-2xl font-bold text-slate-800">
              2. Digite a Mensagem do Show
            </label>
            <textarea
              disabled={isSending}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Digite aqui o texto da mensagem que será enviada para os contatos..."
              rows={8}
              className="w-full text-xl p-5 rounded-xl border-2 border-slate-300 outline-none focus:border-brand transition-colors resize-none"
            />
          </div>

          {/* Anexar flyer file upload */}
          <div className="space-y-3">
            <label className="block text-2xl font-bold text-slate-800">
              3. Foto ou Panfleto do Show (Opcional)
            </label>
            
            {!file ? (
              <label className={`flex flex-col items-center justify-center border-4 border-dashed rounded-xl p-10 cursor-pointer transition-all hover:bg-slate-50 ${isUploading ? "border-slate-300 bg-slate-50" : "border-slate-300"}`}>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={handleFileChange}
                  disabled={isSending || isUploading}
                />
                {isUploading ? (
                  <>
                    <Loader2 className="h-14 w-14 text-brand animate-spin mb-3" />
                    <span className="text-xl font-bold text-slate-700">Enviando arquivo para o servidor...</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-14 w-14 text-slate-500 mb-3" />
                    <span className="text-xl font-bold text-slate-700">Clique aqui para Anexar Foto ou PDF</span>
                    <span className="text-base text-slate-500 mt-1">Imagens (JPG, PNG) ou panfletos PDF</span>
                  </>
                )}
              </label>
            ) : (
              <div className="flex items-center justify-between border-2 border-emerald-500 bg-emerald-50/20 p-5 rounded-xl">
                <div className="flex items-center gap-3 truncate">
                  <FileImage className="h-10 w-10 text-emerald-600 shrink-0" />
                  <div className="truncate">
                    <p className="text-lg font-bold text-slate-800 truncate">{file.name}</p>
                    <p className="text-sm text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB · Pronto para envio</p>
                  </div>
                </div>
                <Button
                  disabled={isSending}
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-red-500 hover:text-red-700 hover:bg-red-50 shrink-0"
                  onClick={removeAttachment}
                >
                  <Trash2 className="h-8 w-8" />
                </Button>
              </div>
            )}
          </div>

          {/* Action button */}
          <div className="pt-4 border-t">
            <Button
              onClick={handleSendBulk}
              disabled={isSending || isUploading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-3xl py-8 rounded-2xl shadow-lg transition-transform active:scale-98 flex items-center justify-center gap-3 shrink-0"
            >
              {isSending ? (
                <>
                  <Loader2 className="h-9 w-9 animate-spin" />
                  ENVIANDO... ({currentIndex + 1} de {targets.length})
                </>
              ) : (
                <>
                  <Send className="h-9 w-9" />
                  ENVIAR PARA TODOS
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Progress status logs card */}
      {(isSending || logs.length > 0) && (
        <Card className="border-2 border-slate-200 shadow-md">
          <CardHeader className="bg-slate-50 border-b p-6 flex flex-row justify-between items-center">
            <div>
              <CardTitle className="text-2xl font-bold text-slate-800">
                Progresso do Envio
              </CardTitle>
              <p className="text-slate-600 text-base mt-1">
                Disparando mensagens em fila com delay de 3 segundos para a sua segurança.
              </p>
            </div>
            {completed && (
              <Badge className="bg-emerald-600 text-white text-base py-1 px-3">
                Concluído!
              </Badge>
            )}
          </CardHeader>
          <CardContent className="p-6">
            {/* Progress Bar */}
            {targets.length > 0 && (
              <div className="mb-6">
                <div className="flex justify-between text-lg font-bold text-slate-700 mb-2">
                  <span>Enviado: {completed ? targets.length : currentIndex} de {targets.length}</span>
                  <span>{Math.round(((completed ? targets.length : currentIndex) / targets.length) * 100)}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden border">
                  <div 
                    className="bg-emerald-600 h-full transition-all duration-300"
                    style={{ width: `${((completed ? targets.length : currentIndex) / targets.length) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Execution logs */}
            <div className="max-h-60 overflow-y-auto border rounded-xl divide-y bg-slate-50/50">
              {logs.map((log, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-background">
                  <span className="text-lg font-semibold text-slate-800">{log.name}</span>
                  
                  <span className="flex items-center gap-2">
                    {log.status === "pending" && (
                      <>
                        {i === currentIndex && isSending ? (
                          <>
                            <Loader2 className="h-5 w-5 text-brand animate-spin" />
                            <span className="text-sm font-bold text-brand">Enviando...</span>
                          </>
                        ) : (
                          <>
                            <span className="h-3 w-3 rounded-full bg-slate-300" />
                            <span className="text-sm text-slate-500 font-medium">Aguardando...</span>
                          </>
                        )}
                      </>
                    )}
                    {log.status === "success" && (
                      <>
                        <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                        <span className="text-sm font-bold text-emerald-600">Enviado</span>
                      </>
                    )}
                    {log.status === "error" && (
                      <>
                        <AlertCircle className="h-6 w-6 text-red-500" />
                        <span className="text-sm font-bold text-red-500">Falha</span>
                      </>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

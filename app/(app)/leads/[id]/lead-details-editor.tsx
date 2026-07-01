"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateLeadCityAndNotes } from "./actions";

export function LeadDetailsEditor({
  leadId,
  initialCity,
  initialNotes,
}: {
  leadId: string;
  initialCity: string;
  initialNotes: string;
}) {
  const [city, setCity] = useState(initialCity);
  const [notes, setNotes] = useState(initialNotes);
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    start(async () => {
      try {
        await updateLeadCityAndNotes(leadId, city, notes);
        setMessage({ text: "Dados atualizados com sucesso!", type: "success" });
        setTimeout(() => setMessage(null), 3000);
      } catch (err) {
        setMessage({ text: (err as Error).message, type: "error" });
      }
    });
  }

  return (
    <form onSubmit={handleSave} className="space-y-6 rounded-xl border-2 border-brand/50 bg-card p-6 shadow-sm ring-1 ring-brand/10">
      <div className="space-y-4">
        <h2 className="font-display text-2xl font-black tracking-tight text-brand flex items-center gap-2">
          📝 Observações do Cliente & Localidade
        </h2>
        
        {/* City Input */}
        <div className="space-y-2">
          <Label htmlFor="city-input" className="text-lg font-bold text-slate-800">
            Cidade / Região do Show
          </Label>
          <Input
            id="city-input"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Ex: Porto Alegre, Gramado, etc."
            className="h-12 text-base font-semibold px-4"
          />
        </div>

        {/* Notes Textarea */}
        <div className="space-y-2">
          <Label htmlFor="notes-input" className="text-lg font-bold text-slate-800">
            Anotações de Conversa / Histórico (Telefone & WhatsApp)
          </Label>
          <Textarea
            id="notes-input"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Digite aqui tudo o que conversou com o cliente (datas preferidas, valores combinados, etc.)."
            rows={7}
            className="text-lg leading-relaxed px-4 py-3 font-medium"
          />
        </div>
      </div>

      {message && (
        <div
          className={`rounded-md p-3 text-base font-bold ${
            message.type === "success"
              ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
              : "bg-destructive/10 border border-destructive/20 text-destructive"
          }`}
        >
          {message.text}
        </div>
      )}

      <Button
        type="submit"
        size="lg"
        className="w-full h-14 text-lg font-bold shadow-md bg-emerald-600 hover:bg-emerald-700 text-white hover:scale-101 active:scale-99 transition-all shrink-0"
        disabled={pending}
      >
        {pending ? (
          <>
            <Loader2 className="h-6 w-6 animate-spin" /> Salvando...
          </>
        ) : (
          "Salvar Observações"
        )}
      </Button>
    </form>
  );
}

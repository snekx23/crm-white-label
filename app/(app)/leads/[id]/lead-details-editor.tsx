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
    <form onSubmit={handleSave} className="space-y-6 rounded-xl border border-border/75 bg-card p-6 shadow-sm">
      <div className="space-y-4">
        <h2 className="font-display text-xl font-bold tracking-tight text-foreground">
          Observações & Localidade
        </h2>
        
        {/* City Input */}
        <div className="space-y-2">
          <Label htmlFor="city-input" className="text-base font-bold">
            Cidade / Região do Show
          </Label>
          <Input
            id="city-input"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Ex: Porto Alegre, Gramado, etc."
            className="h-12 text-base font-medium px-4"
          />
        </div>

        {/* Notes Textarea */}
        <div className="space-y-2">
          <Label htmlFor="notes-input" className="text-base font-bold">
            Anotações de Conversa / Histórico
          </Label>
          <Textarea
            id="notes-input"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Digite aqui tudo o que conversou com o cliente (datas preferidas, valores combinados, etc.)."
            rows={6}
            className="text-lg leading-relaxed px-4 py-3"
          />
        </div>
      </div>

      {message && (
        <div
          className={`rounded-md p-3 text-sm font-medium ${
            message.type === "success"
              ? "bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400"
              : "bg-destructive/10 border border-destructive/20 text-destructive"
          }`}
        >
          {message.text}
        </div>
      )}

      <Button
        type="submit"
        variant="brand"
        size="lg"
        className="w-full h-12 text-base font-bold shadow-md"
        disabled={pending}
      >
        {pending ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" /> Salvando...
          </>
        ) : (
          "Salvar Observações"
        )}
      </Button>
    </form>
  );
}

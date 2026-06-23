"use client";

import { useState } from "react";
import { Handshake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { setMeetingOutcome } from "./actions";

const OPTIONS = [
  { value: "done", label: "Feita (sem fechar)", desc: "A reunião aconteceu" },
  { value: "closed_on_call", label: "Fechou na reunião", desc: "Virou cliente na call" },
  { value: "closed_later", label: "Fechou depois", desc: "Fechou dias após a reunião" },
  { value: "no_show", label: "Não compareceu", desc: "Cliente faltou" },
];

export function MeetingOutcomeDialog({
  appointmentId,
  leadName,
  currentOutcome,
}: {
  appointmentId: string;
  leadName: string;
  currentOutcome: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [outcome, setOutcome] = useState(currentOutcome && currentOutcome !== "pending" ? currentOutcome : "done");
  const isClose = outcome === "closed_on_call" || outcome === "closed_later";

  return (
    <>
      <Button size="icon" variant="ghost" className="h-8 w-8" title="Registrar desfecho" onClick={() => setOpen(true)}>
        <Handshake className="h-4 w-4" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Handshake className="h-5 w-5 text-emerald-500" />
              Desfecho da reunião
            </DialogTitle>
            <DialogDescription>{leadName}</DialogDescription>
          </DialogHeader>
          <form action={setMeetingOutcome} onSubmit={() => setOpen(false)} className="space-y-4">
            <input type="hidden" name="id" value={appointmentId} />
            <div className="grid grid-cols-2 gap-2">
              {OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setOutcome(opt.value)}
                  className={cn(
                    "rounded-xl border p-3 text-left transition-colors",
                    outcome === opt.value
                      ? "border-brand bg-brand/5 ring-1 ring-brand/30"
                      : "border-border/60 hover:bg-muted/40",
                  )}
                >
                  <p className="text-sm font-medium">{opt.label}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{opt.desc}</p>
                </button>
              ))}
            </div>
            <input type="hidden" name="outcome" value={outcome} />

            {isClose && (
              <div className="space-y-1.5">
                <Label htmlFor="deal_value">Valor do fechamento (R$)</Label>
                <Input id="deal_value" name="deal_value" type="number" min="0" step="0.01" placeholder="0,00" />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="cost">Custo da reunião (R$) — opcional</Label>
              <Input id="cost" name="cost" type="number" min="0" step="0.01" placeholder="Ex: custo de anúncio para gerar o lead" />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" variant="brand">
                Salvar desfecho
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

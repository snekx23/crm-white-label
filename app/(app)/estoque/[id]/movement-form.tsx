"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { StockMovementKind } from "@/lib/supabase/database.types";
import { recordMovement } from "../actions";

export function MovementForm({ productId }: { productId: string }) {
  const [kind, setKind] = useState<StockMovementKind>("in");
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      await recordMovement({ productId, kind, quantity, reason });
      setQuantity(1);
      setReason("");
    });
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-4">
      <div className="space-y-1.5">
        <Label>Tipo</Label>
        <Select value={kind} onValueChange={(v) => setKind(v as StockMovementKind)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="in">Entrada</SelectItem>
            <SelectItem value="out">Saida</SelectItem>
            <SelectItem value="adjust">Ajuste</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Quantidade</Label>
        <Input type="number" min={1} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />
      </div>
      <div className="space-y-1.5 md:col-span-2">
        <Label>Motivo</Label>
        <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Compra do fornecedor X..." />
      </div>
      <div className="md:col-span-4">
        <Button type="submit" variant="brand" disabled={pending}>
          {pending ? "Salvando..." : "Registrar movimentacao"}
        </Button>
      </div>
    </form>
  );
}

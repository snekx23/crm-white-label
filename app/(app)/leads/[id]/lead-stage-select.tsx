"use client";

import { useTransition } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateLead } from "../actions";

export function LeadStageSelect({
  leadId,
  stageId,
  stages,
}: {
  leadId: string;
  stageId: string | null;
  stages: { id: string; name: string; color: string | null }[];
}) {
  const [pending, start] = useTransition();
  return (
    <Select
      value={stageId ?? undefined}
      disabled={pending}
      onValueChange={(value) => start(async () => { await updateLead(leadId, { stage_id: value }); })}
    >
      <SelectTrigger className="w-full max-w-xs">
        <SelectValue placeholder="Selecione" />
      </SelectTrigger>
      <SelectContent>
        {stages.map((s) => (
          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

"use client";

import {
  Zap,
  Send,
  GitBranch,
  Clock,
  Tag,
  UserCheck,
  ListTodo,
  ActivitySquare,
  MoveRight,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

type BlockDef = {
  type: "trigger" | "action" | "condition" | "wait" | "end";
  kind: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
};

const blocks: BlockDef[] = [
  // Triggers
  { type: "trigger", kind: "lead_created", label: "Lead criado", icon: Zap, color: "text-violet-600" },
  { type: "trigger", kind: "stage_changed", label: "Etapa alterada", icon: MoveRight, color: "text-violet-600" },
  { type: "trigger", kind: "message_received", label: "Mensagem recebida", icon: Send, color: "text-violet-600" },
  { type: "trigger", kind: "appointment_near", label: "Agendamento proximo", icon: Clock, color: "text-violet-600" },
  // Actions
  { type: "action", kind: "send_message", label: "Enviar mensagem", icon: Send, color: "text-blue-600" },
  { type: "action", kind: "move_stage", label: "Mover etapa", icon: MoveRight, color: "text-green-600" },
  { type: "action", kind: "assign_lead", label: "Atribuir lead", icon: UserCheck, color: "text-orange-600" },
  { type: "action", kind: "create_task", label: "Criar tarefa", icon: ListTodo, color: "text-yellow-600" },
  { type: "action", kind: "add_tag", label: "Adicionar tag", icon: Tag, color: "text-pink-600" },
  { type: "action", kind: "log_activity", label: "Registrar atividade", icon: ActivitySquare, color: "text-gray-600" },
  // Control
  { type: "wait", kind: "wait", label: "Aguardar", icon: Clock, color: "text-amber-600" },
  { type: "condition", kind: "condition", label: "Condicao", icon: GitBranch, color: "text-cyan-600" },
  { type: "end", kind: "end", label: "Encerrar", icon: X, color: "text-red-600" },
];

const sections = [
  { label: "Gatilhos", filter: (b: BlockDef) => b.type === "trigger" },
  { label: "Acoes", filter: (b: BlockDef) => b.type === "action" },
  { label: "Controle", filter: (b: BlockDef) => ["wait", "condition", "end"].includes(b.type) },
];

export function BlockPanel({
  onAddBlock,
}: {
  onAddBlock: (type: string, kind: string, label: string) => void;
}) {
  return (
    <div className="w-56 shrink-0 overflow-y-auto border-r border-border bg-card/60 p-3 space-y-4">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-1">
        Blocos disponíveis
      </p>
      {sections.map((section) => (
        <div key={section.label}>
          <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            {section.label}
          </p>
          <div className="space-y-1">
            {blocks.filter(section.filter).map((block) => {
              const Icon = block.icon;
              return (
                <button
                  key={`${block.type}-${block.kind}`}
                  onClick={() => onAddBlock(block.type, block.kind, block.label)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg border border-border/50 bg-background px-2.5 py-2 text-left text-xs font-medium transition-colors hover:border-brand/40 hover:bg-brand/5",
                  )}
                >
                  <Icon className={cn("h-4 w-4 shrink-0", block.color)} />
                  {block.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <div className="rounded-md border border-dashed border-border/50 p-2.5 text-[10px] text-muted-foreground text-center">
        Arraste os blocos para o canvas ou clique para adicionar
      </div>
    </div>
  );
}

"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
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

const kindMeta: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  // Triggers
  lead_created: { label: "Lead criado", icon: Zap, color: "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-400 dark:border-violet-800" },
  stage_changed: { label: "Etapa alterada", icon: MoveRight, color: "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-400 dark:border-violet-800" },
  message_received: { label: "Mensagem recebida", icon: Send, color: "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-400 dark:border-violet-800" },
  appointment_created: { label: "Agendamento criado", icon: Zap, color: "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-400 dark:border-violet-800" },
  appointment_near: { label: "Agendamento proximo", icon: Clock, color: "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-400 dark:border-violet-800" },
  lead_inactive: { label: "Lead inativo", icon: Clock, color: "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-400 dark:border-violet-800" },
  // Actions
  send_message: { label: "Enviar mensagem", icon: Send, color: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800" },
  move_stage: { label: "Mover etapa", icon: MoveRight, color: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800" },
  assign_lead: { label: "Atribuir lead", icon: UserCheck, color: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800" },
  create_task: { label: "Criar tarefa", icon: ListTodo, color: "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800" },
  add_tag: { label: "Adicionar tag", icon: Tag, color: "bg-pink-100 text-pink-700 border-pink-200 dark:bg-pink-900/30 dark:text-pink-400 dark:border-pink-800" },
  log_activity: { label: "Registrar atividade", icon: ActivitySquare, color: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700" },
  // Control
  wait: { label: "Aguardar", icon: Clock, color: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800" },
  condition: { label: "Condicao", icon: GitBranch, color: "bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-400 dark:border-cyan-800" },
  end: { label: "Encerrar", icon: X, color: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800" },
};

function FlowNode({
  data,
  selected,
  isTrigger,
  isCondition,
  isEnd,
}: NodeProps & { isTrigger?: boolean; isCondition?: boolean; isEnd?: boolean }) {
  const kind = (data.kind as string) ?? (data.type as string);
  const meta = kindMeta[kind] ?? { label: kind, icon: Zap, color: "bg-muted text-foreground border-border" };
  const Icon = meta.icon;
  const label = (data.label as string) ?? meta.label;
  const config = (data.config as Record<string, unknown>) ?? {};

  return (
    <div
      className={cn(
        "min-w-[200px] max-w-[260px] rounded-xl border-2 bg-background shadow-sm transition-shadow",
        selected ? "shadow-md ring-2 ring-brand ring-offset-1" : "shadow-sm",
        meta.color.includes("violet") && "border-violet-200 dark:border-violet-800",
      )}
    >
      {!isTrigger && (
        <Handle
          type="target"
          position={Position.Top}
          className="!h-3 !w-3 !rounded-full !border-2 !border-background !bg-brand"
        />
      )}

      <div className={cn("rounded-t-[10px] border-b px-3 py-2 flex items-center gap-2", meta.color)}>
        <Icon className="h-4 w-4 shrink-0" />
        <span className="text-xs font-semibold truncate">{label}</span>
      </div>

      <div className="px-3 py-2 text-xs text-muted-foreground space-y-1">
        {kind === "send_message" && config.message && (
          <p className="line-clamp-2 italic">"{String(config.message)}"</p>
        )}
        {kind === "wait" && config.minutes && (
          <p>Aguardar {String(config.minutes)} minutos</p>
        )}
        {kind === "create_task" && config.title && (
          <p>Tarefa: {String(config.title)}</p>
        )}
        {kind === "add_tag" && config.tag && (
          <p>Tag: <span className="font-medium text-pink-600">#{String(config.tag)}</span></p>
        )}
        {kind === "condition" && config.field && (
          <p>{String(config.field)} {String(config.operator ?? "=")} {String(config.value ?? "")}</p>
        )}
        {!Object.keys(config).some((k) => config[k]) && (
          <p className="italic opacity-60">Clique para configurar</p>
        )}
      </div>

      {!isEnd && !isCondition && (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!h-3 !w-3 !rounded-full !border-2 !border-background !bg-brand"
        />
      )}

      {isCondition && (
        <>
          <Handle
            type="source"
            position={Position.Bottom}
            id="yes"
            style={{ left: "30%" }}
            className="!h-3 !w-3 !rounded-full !border-2 !border-background !bg-green-500"
          />
          <Handle
            type="source"
            position={Position.Bottom}
            id="no"
            style={{ left: "70%" }}
            className="!h-3 !w-3 !rounded-full !border-2 !border-background !bg-red-400"
          />
          <div className="flex justify-between px-4 pb-1 text-[10px] text-muted-foreground">
            <span className="text-green-600">Sim</span>
            <span className="text-red-500">Nao</span>
          </div>
        </>
      )}
    </div>
  );
}

export function TriggerNode(props: NodeProps) {
  return <FlowNode {...props} isTrigger />;
}
TriggerNode.displayName = "TriggerNode";

export function ActionNode(props: NodeProps) {
  return <FlowNode {...props} />;
}
ActionNode.displayName = "ActionNode";

export function ConditionNode(props: NodeProps) {
  return <FlowNode {...props} isCondition />;
}
ConditionNode.displayName = "ConditionNode";

export function WaitNode(props: NodeProps) {
  return <FlowNode {...props} />;
}
WaitNode.displayName = "WaitNode";

export function EndNode(props: NodeProps) {
  return <FlowNode {...props} isEnd />;
}
EndNode.displayName = "EndNode";

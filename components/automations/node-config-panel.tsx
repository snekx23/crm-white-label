"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import type { Node } from "@xyflow/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Props = {
  node: Node;
  onUpdate: (config: Record<string, unknown>) => void;
  onClose: () => void;
};

export function NodeConfigPanel({ node, onUpdate, onClose }: Props) {
  const kind = (node.data.kind as string) ?? node.type ?? "";
  const [config, setConfig] = useState<Record<string, unknown>>(
    (node.data.config as Record<string, unknown>) ?? {},
  );

  useEffect(() => {
    setConfig((node.data.config as Record<string, unknown>) ?? {});
  }, [node.id, node.data.config]);

  function set(key: string, value: unknown) {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    onUpdate(config);
  }

  return (
    <div className="w-72 shrink-0 overflow-y-auto border-l border-border bg-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-sm">{node.data.label as string}</p>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-4">
        {/* send_message */}
        {kind === "send_message" && (
          <div className="space-y-1.5">
            <Label>Mensagem</Label>
            <Textarea
              rows={4}
              placeholder="Ola {name}! Seja bem-vindo..."
              value={String(config.message ?? "")}
              onChange={(e) => set("message", e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Variaveis: <code>{"{name}"}</code>, <code>{"{phone}"}</code>, <code>{"{email}"}</code>
            </p>
          </div>
        )}

        {/* wait */}
        {kind === "wait" && (
          <div className="space-y-1.5">
            <Label>Aguardar (minutos)</Label>
            <Input
              type="number"
              min={1}
              placeholder="60"
              value={String(config.minutes ?? "")}
              onChange={(e) => set("minutes", Number(e.target.value))}
            />
          </div>
        )}

        {/* move_stage */}
        {kind === "move_stage" && (
          <div className="space-y-1.5">
            <Label>ID da etapa</Label>
            <Input
              placeholder="uuid da etapa"
              value={String(config.stage_id ?? "")}
              onChange={(e) => set("stage_id", e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Copie o ID da etapa em Funis → Configuracoes.
            </p>
          </div>
        )}

        {/* assign_lead */}
        {kind === "assign_lead" && (
          <div className="space-y-1.5">
            <Label>ID do usuario</Label>
            <Input
              placeholder="uuid do usuario"
              value={String(config.user_id ?? "")}
              onChange={(e) => set("user_id", e.target.value)}
            />
          </div>
        )}

        {/* create_task */}
        {kind === "create_task" && (
          <>
            <div className="space-y-1.5">
              <Label>Titulo da tarefa</Label>
              <Input
                placeholder="Ligar para {name}"
                value={String(config.title ?? "")}
                onChange={(e) => set("title", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Prazo em dias (0 = sem prazo)</Label>
              <Input
                type="number"
                min={0}
                placeholder="3"
                value={String(config.due_days ?? "")}
                onChange={(e) => set("due_days", Number(e.target.value))}
              />
            </div>
          </>
        )}

        {/* add_tag */}
        {kind === "add_tag" && (
          <div className="space-y-1.5">
            <Label>Tag</Label>
            <Input
              placeholder="nova-cliente"
              value={String(config.tag ?? "")}
              onChange={(e) => set("tag", e.target.value)}
            />
          </div>
        )}

        {/* log_activity */}
        {kind === "log_activity" && (
          <div className="space-y-1.5">
            <Label>Mensagem da atividade</Label>
            <Input
              placeholder="Automacao executada para {name}"
              value={String(config.message ?? "")}
              onChange={(e) => set("message", e.target.value)}
            />
          </div>
        )}

        {/* condition */}
        {kind === "condition" && (
          <>
            <div className="space-y-1.5">
              <Label>Campo do lead</Label>
              <Select
                value={String(config.field ?? "")}
                onValueChange={(v) => set("field", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o campo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="source">Origem</SelectItem>
                  <SelectItem value="stage_id">Etapa</SelectItem>
                  <SelectItem value="assigned_to">Responsavel</SelectItem>
                  <SelectItem value="tags">Tags</SelectItem>
                  <SelectItem value="name">Nome</SelectItem>
                  <SelectItem value="phone">Telefone</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Operador</Label>
              <Select
                value={String(config.operator ?? "eq")}
                onValueChange={(v) => set("operator", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="eq">Igual a</SelectItem>
                  <SelectItem value="neq">Diferente de</SelectItem>
                  <SelectItem value="contains">Contem</SelectItem>
                  <SelectItem value="gt">Maior que</SelectItem>
                  <SelectItem value="lt">Menor que</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Valor</Label>
              <Input
                placeholder="instagram"
                value={String(config.value ?? "")}
                onChange={(e) => set("value", e.target.value)}
              />
            </div>
          </>
        )}

        {/* Triggers: no config needed */}
        {node.type === "trigger" && (
          <p className="text-xs text-muted-foreground italic">
            O gatilho e ativado automaticamente pelo CRM. Nenhuma configuracao necessaria.
          </p>
        )}

        {/* End */}
        {kind === "end" && (
          <p className="text-xs text-muted-foreground italic">
            Encerra o fluxo quando atingido.
          </p>
        )}
      </div>

      {node.type !== "trigger" && kind !== "end" && (
        <Button size="sm" className="w-full" onClick={handleSave}>
          Aplicar
        </Button>
      )}
    </div>
  );
}

"use client";

import { useMemo, useState, useTransition } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Loader2, Pencil, Plus, Trash2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { QuickMessage } from "@/lib/supabase/database.types";
import { QUICK_MESSAGE_PRESETS } from "@/lib/quick-messages/presets";
import {
  createQuickMessage,
  updateQuickMessage,
  deleteQuickMessage,
  addPresetQuickMessage,
  reorderQuickMessages,
} from "@/app/(app)/settings/quick-messages-actions";

export function QuickMessagesPanel({ initialMessages }: { initialMessages: QuickMessage[] }) {
  const [messages, setMessages] = useState(initialMessages);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<QuickMessage | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const missingPresets = useMemo(() => {
    const have = new Set(messages.map((m) => `${m.title}::${m.body}`));
    return QUICK_MESSAGE_PRESETS.map((p, i) => ({ ...p, index: i })).filter(
      (p) => !have.has(`${p.title}::${p.body}`),
    );
  }, [messages]);

  function openCreate() {
    setEditing(null);
    setTitle("");
    setBody("");
    setEditorOpen(true);
  }

  function openEdit(m: QuickMessage) {
    setEditing(m);
    setTitle(m.title);
    setBody(m.body);
    setEditorOpen(true);
  }

  function onSave() {
    setMsg(null);
    start(async () => {
      try {
        if (editing) {
          await updateQuickMessage({ id: editing.id, title, body });
          setMessages((prev) =>
            prev.map((m) => (m.id === editing.id ? { ...m, title, body } : m)),
          );
        } else {
          await createQuickMessage({ title, body });
          window.location.reload();
          return;
        }
        setEditorOpen(false);
        setMsg("Salvo");
      } catch (e) {
        setMsg((e as Error).message);
      }
    });
  }

  function onDelete(id: string) {
    if (!confirm("Excluir esta mensagem rapida?")) return;
    start(async () => {
      try {
        await deleteQuickMessage(id);
        setMessages((prev) => prev.filter((m) => m.id !== id));
      } catch (e) {
        setMsg((e as Error).message);
      }
    });
  }

  function onAddPreset(index: number) {
    setMsg(null);
    start(async () => {
      try {
        await addPresetQuickMessage(index);
        window.location.reload();
      } catch (e) {
        setMsg((e as Error).message);
      }
    });
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = messages.findIndex((m) => m.id === active.id);
    const newIndex = messages.findIndex((m) => m.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const next = arrayMove(messages, oldIndex, newIndex);
    setMessages(next);
    start(async () => {
      try {
        await reorderQuickMessages(next.map((m) => m.id));
      } catch (e) {
        setMessages(messages);
        setMsg((e as Error).message);
      }
    });
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Frases prontas para o chat. Qualquer membro da empresa pode criar, editar e reordenar
        arrastando pela alça à esquerda.
      </p>

      {missingPresets.length > 0 && (
        <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium">
            <Sparkles className="h-4 w-4 text-brand" />
            Modelos prontos
          </div>
          <div className="flex flex-wrap gap-2">
            {missingPresets.map((p) => (
              <Button
                key={p.index}
                type="button"
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() => onAddPreset(p.index)}
              >
                + {p.title}
              </Button>
            ))}
          </div>
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={messages.map((m) => m.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {messages.map((m) => (
              <SortableRow
                key={m.id}
                message={m}
                disabled={pending}
                onEdit={() => openEdit(m)}
                onDelete={() => onDelete(m.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <Button type="button" variant="outline" onClick={openCreate}>
        <Plus className="h-4 w-4" />
        Nova mensagem
      </Button>

      {msg && <p className="text-sm text-muted-foreground">{msg}</p>}

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar mensagem" : "Nova mensagem rápida"}</DialogTitle>
            <DialogDescription>
              Título curto para identificar no chat; o texto completo será inserido na conversa.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="qm-title">Título</Label>
              <Input
                id="qm-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex.: Saudacao"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="qm-body">Mensagem</Label>
              <Textarea
                id="qm-body"
                rows={5}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Texto enviado ao cliente..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setEditorOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" variant="brand" onClick={onSave} disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SortableRow({
  message,
  disabled,
  onEdit,
  onDelete,
}: {
  message: QuickMessage;
  disabled: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: message.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.85 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-start gap-2 rounded-xl border border-border/60 bg-card/80 p-3 shadow-sm"
    >
      <button
        type="button"
        className="mt-0.5 shrink-0 cursor-grab touch-none rounded p-1 text-muted-foreground hover:bg-muted active:cursor-grabbing"
        aria-label="Reordenar"
        disabled={disabled}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{message.title}</p>
        <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{message.body}</p>
      </div>
      <div className="flex shrink-0 gap-1">
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit} disabled={disabled}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive"
          onClick={onDelete}
          disabled={disabled}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

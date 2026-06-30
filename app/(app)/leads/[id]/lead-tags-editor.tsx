"use client";

import { useState, useTransition } from "react";
import { updateLeadTags } from "./actions";

const PRESET_TAGS = ["Prefeitura", "Clube", "Baile", "Contato Inicial", "Frio", "Show Fechado"];

const TAG_COLORS: Record<string, { bg: string; text: string; border: string; activeBg: string; activeText: string }> = {
  "Prefeitura": { 
    bg: "bg-blue-50/50 dark:bg-blue-950/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900/40", 
    activeBg: "bg-blue-600 hover:bg-blue-700 text-white border-blue-600",
    text: "text-blue-700 dark:text-blue-400",
    border: "border-blue-200 dark:border-blue-900/40",
    activeText: "text-white"
  },
  "Clube": { 
    bg: "bg-purple-50/50 dark:bg-purple-950/10 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-900/40", 
    activeBg: "bg-purple-600 hover:bg-purple-700 text-white border-purple-600",
    text: "text-purple-700 dark:text-purple-400",
    border: "border-purple-200 dark:border-purple-900/40",
    activeText: "text-white"
  },
  "Baile": { 
    bg: "bg-indigo-50/50 dark:bg-indigo-950/10 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900/40", 
    activeBg: "bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600",
    text: "text-indigo-700 dark:text-indigo-400",
    border: "border-indigo-200 dark:border-indigo-900/40",
    activeText: "text-white"
  },
  "Contato Inicial": { 
    bg: "bg-amber-50/50 dark:bg-amber-950/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/40", 
    activeBg: "bg-amber-600 hover:bg-amber-700 text-white border-amber-600",
    text: "text-amber-700 dark:text-amber-400",
    border: "border-amber-200 dark:border-amber-900/40",
    activeText: "text-white"
  },
  "Frio": { 
    bg: "bg-cyan-50/50 dark:bg-cyan-950/10 text-cyan-700 dark:text-cyan-400 border-cyan-200 dark:border-cyan-900/40", 
    activeBg: "bg-cyan-600 hover:bg-cyan-700 text-white border-cyan-600",
    text: "text-cyan-700 dark:text-cyan-400",
    border: "border-cyan-200 dark:border-cyan-900/40",
    activeText: "text-white"
  },
  "Show Fechado": { 
    bg: "bg-emerald-50/50 dark:bg-emerald-950/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/40", 
    activeBg: "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600",
    text: "text-emerald-700 dark:text-emerald-400",
    border: "border-emerald-200 dark:border-emerald-900/40",
    activeText: "text-white"
  },
};

export function LeadTagsEditor({
  leadId,
  initialTags,
}: {
  leadId: string;
  initialTags: string[];
}) {
  const [tags, setTags] = useState<string[]>(initialTags);
  const [pending, start] = useTransition();

  function handleToggle(tag: string) {
    const nextTags = tags.includes(tag)
      ? tags.filter((t) => t !== tag)
      : [...tags, tag];

    setTags(nextTags);
    start(async () => {
      try {
        await updateLeadTags(leadId, nextTags);
      } catch (err) {
        console.error("Failed to update tags:", err);
      }
    });
  }

  return (
    <div className="space-y-3 rounded-xl border border-border/75 bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold tracking-tight text-foreground">
          Etiquetas do Cliente
        </h2>
        {pending && (
          <span className="text-xs text-muted-foreground animate-pulse">
            Salvando alterações...
          </span>
        )}
      </div>
      
      <p className="text-sm text-muted-foreground">
        Clique nas etiquetas abaixo para classificar visualmente o tipo de contratante.
      </p>

      <div className="flex flex-wrap gap-2.5 pt-2">
        {PRESET_TAGS.map((tag) => {
          const isActive = tags.includes(tag);
          const colors = TAG_COLORS[tag] || {
            bg: "bg-muted text-muted-foreground border-border",
            activeBg: "bg-foreground text-background border-foreground",
          };

          return (
            <button
              key={tag}
              type="button"
              onClick={() => handleToggle(tag)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-base font-bold transition-all hover:scale-105 duration-100 ${
                isActive ? colors.activeBg : colors.bg
              }`}
            >
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  isActive ? "bg-white" : "bg-muted-foreground/40"
                }`}
              />
              {tag}
            </button>
          );
        })}
      </div>
    </div>
  );
}

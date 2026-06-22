"use client";

import Link from "next/link";
import { Zap, Settings2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { QuickMessage } from "@/lib/supabase/database.types";

export function QuickRepliesPicker({
  messages,
  onPick,
  disabled,
}: {
  messages: QuickMessage[];
  onPick: (body: string) => void;
  disabled?: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-12 w-12 shrink-0 rounded-xl"
          disabled={disabled}
          aria-label="Mensagens rápidas"
          title="Mensagens rápidas"
        >
          <Zap className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-96 w-72 overflow-y-auto">
        <DropdownMenuLabel className="flex items-center justify-between">
          Mensagens rápidas
          <Link
            href="/settings#mensagens-rapidas"
            className="inline-flex items-center gap-1 text-xs font-normal text-brand hover:underline"
            title="Organizar mensagens rápidas"
          >
            <Settings2 className="h-3.5 w-3.5" />
            Organizar
          </Link>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {messages.length === 0 ? (
          <div className="px-2 py-6 text-center">
            <p className="text-sm text-muted-foreground">Nenhuma mensagem rápida ainda.</p>
            <Button asChild variant="outline" size="sm" className="mt-3 rounded-lg">
              <Link href="/settings#mensagens-rapidas">
                <Plus className="h-3.5 w-3.5" /> Criar mensagens
              </Link>
            </Button>
          </div>
        ) : (
          messages.map((m) => (
            <DropdownMenuItem
              key={m.id}
              className="flex cursor-pointer flex-col items-start gap-0.5 py-2"
              onSelect={() => onPick(m.body)}
            >
              <span className="text-sm font-medium">{m.title}</span>
              <span className="line-clamp-2 text-xs text-muted-foreground">{m.body}</span>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

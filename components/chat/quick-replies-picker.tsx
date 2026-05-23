"use client";

import { Zap } from "lucide-react";
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
  if (messages.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-12 w-12 shrink-0 rounded-xl"
          disabled={disabled}
          aria-label="Mensagens rapidas"
        >
          <Zap className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-80 w-72 overflow-y-auto">
        <DropdownMenuLabel>Mensagens rapidas</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {messages.map((m) => (
          <DropdownMenuItem
            key={m.id}
            className="flex cursor-pointer flex-col items-start gap-0.5 py-2"
            onSelect={() => onPick(m.body)}
          >
            <span className="text-sm font-medium">{m.title}</span>
            <span className="line-clamp-2 text-xs text-muted-foreground">{m.body}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

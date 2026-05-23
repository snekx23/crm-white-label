"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { Search, Inbox } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn, initials } from "@/lib/utils";
import type { ConversationListItem } from "@/lib/chat/types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";

export type { ConversationListItem };

export function ConversationList({ items }: { items: ConversationListItem[] }) {
  const pathname = usePathname();
  const activeLeadId = pathname.startsWith("/chat/") ? (pathname.split("/")[2] ?? null) : null;
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (c) =>
        c.leadName.toLowerCase().includes(q) ||
        c.leadSubtitle.toLowerCase().includes(q) ||
        c.leadPhone.replace(/\D/g, "").includes(q.replace(/\D/g, "")),
    );
  }, [items, query]);

  return (
    <aside className="flex w-[360px] shrink-0 flex-col border-r border-border bg-card dark:border-border/50 dark:bg-card/62">
      <header className="border-b border-border/50 px-4 py-4">
        <h2 className="mb-3 font-display text-lg font-semibold tracking-normal">Conversas</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Pesquisar conversa..."
            className="h-10 rounded-lg border-border/60 bg-background/50 pl-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
            <Inbox className="mb-3 h-10 w-10 text-muted-foreground/60" />
            <p className="text-sm font-medium">Nenhuma conversa</p>
            <p className="mt-1 max-w-[240px] text-xs text-muted-foreground">
              As mensagens do WhatsApp aparecem aqui automaticamente.
            </p>
          </div>
        )}

        {filtered.map((c) => {
          const active = activeLeadId === c.leadId;
          const preview =
            c.lastPreview != null
              ? c.lastDirection === "outbound"
                ? `Voce: ${c.lastPreview}`
                : c.lastPreview
              : "";

          return (
            <Link
              key={c.id}
              href={`/chat/${c.leadId}`}
              prefetch
              className={cn(
                "flex gap-3 border-b border-border/35 px-3 py-3 transition-colors duration-150 hover:bg-brand/10 dark:hover:bg-brand/15",
                active && "border-l-2 border-l-brand bg-brand-muted dark:bg-brand/10",
              )}
            >
              <Avatar className="h-11 w-11 shrink-0">
                <AvatarFallback className="bg-brand-muted text-sm font-semibold text-brand dark:bg-brand dark:text-brand-foreground">
                  {initials(c.leadName)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className={cn("truncate text-sm", c.unread > 0 ? "font-semibold" : "font-medium")}>
                    {c.leadName}
                  </p>
                  {c.lastAt && (
                    <span
                      className={cn(
                        "shrink-0 text-[11px]",
                        c.unread > 0 ? "font-medium text-brand" : "text-muted-foreground",
                      )}
                    >
                      {formatDistanceToNow(new Date(c.lastAt), { locale: ptBR, addSuffix: false })}
                    </span>
                  )}
                </div>
                <div className="mt-0.5 flex items-center justify-between gap-2">
                  <p
                    className={cn(
                      "truncate text-xs text-muted-foreground",
                      c.unread > 0 && "font-medium text-foreground",
                    )}
                  >
                    {preview || c.leadSubtitle}
                  </p>
                  {c.unread > 0 && (
                    <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-brand px-1.5 text-[10px] font-semibold text-brand-foreground">
                      {c.unread > 99 ? "99+" : c.unread}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </aside>
  );
}

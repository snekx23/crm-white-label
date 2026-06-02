"use client";

import { useMemo, useState, useTransition } from "react";
import { Send, UsersRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { sendGroupMessage } from "../../actions";

export type GroupThreadMessage = {
  id: string;
  externalId: string | null;
  direction: "inbound" | "outbound";
  body: string;
  senderName: string | null;
  senderJid: string | null;
  createdAt: string;
};

type GroupThreadLabel = {
  id: string;
  name: string;
  color: string;
};

function formatTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

function uniqueMessages(messages: GroupThreadMessage[]) {
  const byKey = new Map<string, GroupThreadMessage>();
  for (const message of messages) {
    byKey.set(message.externalId ?? message.id, message);
  }
  return [...byKey.values()].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export function GroupChatThread({
  groupId,
  subject,
  participantCount,
  labels,
  initialMessages,
}: {
  groupId: string;
  subject: string;
  participantCount: number | null;
  labels: GroupThreadLabel[];
  initialMessages: GroupThreadMessage[];
}) {
  const [text, setText] = useState("");
  const [messages, setMessages] = useState(initialMessages);
  const [pending, start] = useTransition();

  const sortedMessages = useMemo(() => uniqueMessages(messages), [messages]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body || pending) return;

    const optimistic: GroupThreadMessage = {
      id: `opt-${Date.now()}`,
      externalId: null,
      direction: "outbound",
      body,
      senderName: "Voce",
      senderJid: null,
      createdAt: new Date().toISOString(),
    };
    setText("");
    setMessages((prev) => [...prev, optimistic]);

    start(async () => {
      try {
        const sent = await sendGroupMessage({ groupId, body });
        setMessages((prev) => [...prev.filter((message) => message.id !== optimistic.id), sent]);
      } catch (err) {
        setMessages((prev) => prev.filter((message) => message.id !== optimistic.id));
        alert((err as Error).message);
      }
    });
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col bg-[radial-gradient(900px_520px_at_50%_-8%,hsl(var(--brand)/0.07),transparent_68%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--background)))]">
      <header className="flex shrink-0 items-center gap-3 border-b border-border/50 bg-card/78 px-5 py-3.5 backdrop-blur-md">
        <Avatar className="h-11 w-11 ring-2 ring-info/20">
          <AvatarFallback className="bg-info/10 text-info">
            <UsersRound className="h-5 w-5" />
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-base font-semibold tracking-normal">{subject}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>{participantCount ?? 0} participantes</span>
            {labels.map((label) => (
              <Badge
                key={label.id}
                variant="outline"
                className="px-2 py-0 text-[10px]"
                style={{ borderColor: `${label.color}55`, color: label.color }}
              >
                {label.name}
              </Badge>
            ))}
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-8">
        {sortedMessages.length === 0 ? (
          <div className="flex h-full min-h-[280px] flex-col items-center justify-center text-center">
            <div className="mb-3 rounded-2xl bg-muted/80 px-4 py-3 text-sm text-muted-foreground">
              Nenhuma mensagem de grupo recebida ainda
            </div>
            <p className="max-w-sm text-sm text-muted-foreground">
              Escreva abaixo para iniciar uma mensagem neste grupo.
            </p>
          </div>
        ) : (
          <div className="mx-auto max-w-4xl space-y-3">
            {sortedMessages.map((message) => {
              const outbound = message.direction === "outbound";
              return (
                <div key={message.id} className={cn("flex", outbound ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[min(86%,560px)] rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed shadow-elev-1",
                      outbound
                        ? "rounded-br-md bg-chat-outbound text-chat-outbound-foreground"
                        : "rounded-bl-md border border-border/55 bg-card text-foreground",
                    )}
                  >
                    {!outbound && (
                      <p className="mb-1 text-xs font-semibold text-brand">
                        {message.senderName ?? message.senderJid ?? "Participante"}
                      </p>
                    )}
                    <p className="whitespace-pre-wrap break-words">{message.body}</p>
                    <p className={cn("mt-1 text-right text-[10px]", outbound ? "text-chat-outbound-meta" : "text-muted-foreground")}>
                      {formatTime(message.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <form onSubmit={onSubmit} className="shrink-0 border-t border-border/50 bg-card/86 p-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-end gap-2">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Mensagem para o grupo..."
            className="min-h-11 max-h-32 resize-none rounded-xl border-border/60 bg-background/70"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
          />
          <Button type="submit" variant="brand" size="icon" className="h-11 w-11 shrink-0 rounded-xl" disabled={pending || !text.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </section>
  );
}

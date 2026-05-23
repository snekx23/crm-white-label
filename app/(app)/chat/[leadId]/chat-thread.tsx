"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Send, User, Loader2, Mic2, Pause, Play, Check, CheckCheck } from "lucide-react";
import type { QuickMessage } from "@/lib/supabase/database.types";
import { QuickRepliesPicker } from "@/components/chat/quick-replies-picker";
import { createClient } from "@/lib/supabase/client";
import { fetchMessages } from "@/lib/chat/client";
import type { ChatMessage } from "@/lib/chat/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn, initials } from "@/lib/utils";
import { displayLeadName, displayLeadSubtitle } from "@/lib/leads/display";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LeadDeleteButton } from "@/components/leads/lead-delete-button";
import { sendChatMessage, markConversationRead } from "../actions";

const POLL_MS = 10_000;

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Hoje";
  if (d.toDateString() === yesterday.toDateString()) return "Ontem";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function mergeMessages(prev: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  const map = new Map<string, ChatMessage>();
  for (const m of prev) map.set(m.id, m);
  for (const m of incoming) map.set(m.id, m);
  return [...map.values()].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
}

export function ChatThread({
  leadId,
  leadName,
  leadPhone,
  conversationId: initialConversationId,
  initialMessages,
  quickMessages = [],
}: {
  leadId: string;
  leadName: string;
  leadPhone: string;
  conversationId: string | null;
  initialMessages: ChatMessage[];
  quickMessages?: QuickMessage[];
}) {
  const displayName = displayLeadName(leadName, leadPhone);
  const displayPhone = displayLeadSubtitle(leadPhone);

  const [conversationId, setConversationId] = useState(initialConversationId);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [text, setText] = useState("");
  const [pending, start] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const shouldStickToBottomRef = useRef(true);

  const grouped = useMemo(() => {
    const out: { day: string; items: ChatMessage[] }[] = [];
    for (const m of messages) {
      const day = dayLabel(m.created_at);
      const last = out[out.length - 1];
      if (last?.day === day) last.items.push(m);
      else out.push({ day, items: [m] });
    }
    return out;
  }, [messages]);

  const syncMessages = useCallback(async () => {
    if (!conversationId) return;
    try {
      const next = await fetchMessages(conversationId);
      setMessages((prev) => mergeMessages(prev, next));
    } catch {
      /* mantém estado atual */
    }
  }, [conversationId]);

  const isNearBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 140;
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  useEffect(() => {
    setConversationId(initialConversationId);
    setMessages(initialMessages);
    shouldStickToBottomRef.current = true;
    requestAnimationFrame(() => scrollToBottom("auto"));
  }, [leadId, initialConversationId, initialMessages]);

  useEffect(() => {
    if (!shouldStickToBottomRef.current) return;
    requestAnimationFrame(() => scrollToBottom("smooth"));
  }, [messages]);

  useEffect(() => {
    if (!conversationId) return;
    void markConversationRead(conversationId);
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId) return;
    void syncMessages();
    const timer = setInterval(() => void syncMessages(), POLL_MS);
    return () => clearInterval(timer);
  }, [conversationId, syncMessages]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") void syncMessages();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [syncMessages]);

  useEffect(() => {
    if (!conversationId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const row = payload.new as ChatMessage;
          shouldStickToBottomRef.current = row.direction === "outbound" || isNearBottom();
          setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : mergeMessages(prev, [row])));
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const row = payload.new as ChatMessage;
          setMessages((prev) => prev.map((m) => (m.id === row.id ? row : m)));
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversationId]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body || pending) return;

    const optimistic: ChatMessage = {
      id: `opt-${Date.now()}`,
      body,
      direction: "outbound",
      created_at: new Date().toISOString(),
      status: "pending",
    };
    shouldStickToBottomRef.current = true;
    setText("");
    setMessages((prev) => [...prev, optimistic]);

    start(async () => {
      try {
        const result = await sendChatMessage({ leadId, body });
        if (!conversationId) setConversationId(result.conversationId);
        setMessages((prev) => {
          const withoutOpt = prev.filter((m) => m.id !== optimistic.id);
          return mergeMessages(withoutOpt, [result.message]);
        });
      } catch (err) {
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
        alert((err as Error).message);
      }
    });
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col bg-[radial-gradient(900px_520px_at_50%_-8%,hsl(var(--brand)/0.07),transparent_68%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--background)))]">
      <header className="flex shrink-0 items-center justify-between border-b border-border/50 bg-card/78 px-5 py-3.5 backdrop-blur-md">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar className="h-11 w-11 ring-2 ring-brand/25">
            <AvatarFallback className="bg-brand-muted text-sm font-semibold text-brand dark:bg-brand dark:text-brand-foreground">
              {initials(displayName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate font-display text-base font-semibold tracking-normal">{displayName}</p>
            <p className="truncate text-xs text-muted-foreground">{displayPhone}</p>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button asChild variant="outline" size="sm" className="rounded-lg">
            <Link href={`/leads/${leadId}`} prefetch>
              <User className="h-4 w-4" /> Perfil
            </Link>
          </Button>
          <LeadDeleteButton leadId={leadId} leadName={displayName} redirectTo="/chat" />
        </div>
      </header>

      <div
        ref={scrollRef}
        onScroll={() => {
          shouldStickToBottomRef.current = isNearBottom();
        }}
        className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-8"
      >
        {messages.length === 0 && (
          <div className="flex h-full min-h-[280px] flex-col items-center justify-center text-center">
            <div className="mb-3 rounded-2xl bg-muted/80 px-4 py-3 text-sm text-muted-foreground">
              Nenhuma mensagem ainda
            </div>
            <p className="max-w-sm text-sm text-muted-foreground">
              Escreva abaixo para iniciar a conversa com este lead pelo WhatsApp.
            </p>
          </div>
        )}

        <div className="mx-auto max-w-4xl">
        {grouped.map((group) => (
          <div key={group.day} className="mb-7">
            <div className="mb-4 flex justify-center">
              <span className="rounded-md border border-border/50 bg-card/70 px-3 py-1 text-[11px] font-semibold text-muted-foreground shadow-elev-1">
                {group.day}
              </span>
            </div>
            <div className="space-y-1.5">
              {group.items.map((m, idx) => {
                const prev = group.items[idx - 1];
                const sameAuthor = prev?.direction === m.direction;
                const outbound = m.direction === "outbound";
                return (
                  <div
                    key={m.id}
                    className={cn("flex", outbound ? "justify-end" : "justify-start", sameAuthor ? "mt-0.5" : "mt-3")}
                  >
                    <div
                      className={cn(
                        "max-w-[min(86%,520px)] rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed shadow-elev-1",
                        outbound
                          ? "rounded-br-md bg-chat-outbound text-chat-outbound-foreground shadow-md ring-1 ring-black/5 dark:ring-white/10"
                          : "rounded-bl-md border border-border/55 bg-card text-foreground shadow-elev-1",
                      )}
                    >
                      <MessageContent message={m} />
                      <div
                        className={cn(
                          "mt-1.5 flex items-center justify-end gap-1 text-[10px]",
                          outbound ? "text-chat-outbound-meta" : "text-muted-foreground",
                        )}
                      >
                        <span>
                          {new Date(m.created_at).toLocaleTimeString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        {outbound && <MessageStatusLabel status={m.status} />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        </div>
        <div ref={endRef} />
      </div>

      <form
        onSubmit={onSubmit}
        className="shrink-0 border-t border-border/50 bg-card/92 px-4 py-3 backdrop-blur-md sm:px-6"
      >
        <div className="mx-auto flex max-w-3xl items-end gap-2">
          <QuickRepliesPicker
            messages={quickMessages}
            disabled={pending}
            onPick={(body) => setText((prev) => (prev.trim() ? `${prev.trim()}\n\n${body}` : body))}
          />
          <Textarea
            rows={1}
            placeholder="Digite sua mensagem..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSubmit(e);
              }
            }}
            className="min-h-[48px] max-h-32 flex-1 resize-none rounded-2xl border-border/60 bg-background/70 py-3"
          />
          <Button
            type="submit"
            variant="brand"
            size="icon"
            className="h-12 w-12 shrink-0 rounded-xl"
            disabled={pending || !text.trim()}
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </form>
    </section>
  );
}

function MessageContent({ message: m }: { message: ChatMessage }) {
  const type = m.media_type?.toLowerCase() ?? "";
  const url = m.media_url?.trim();

  if (url && type.startsWith("audio")) {
    return <AudioMessage src={url} label={m.body} outbound={m.direction === "outbound"} />;
  }

  if (url && type.startsWith("image")) {
    return (
      <div className="space-y-1">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="" className="max-h-64 max-w-full rounded-lg object-cover" />
        {m.body && m.body !== "📷 Imagem" && (
          <p className="whitespace-pre-wrap break-words">{m.body}</p>
        )}
      </div>
    );
  }

  if (url && type.startsWith("video")) {
    return (
      <div className="space-y-1">
        <video controls preload="metadata" src={url} className="max-h-64 max-w-full rounded-lg" />
        {m.body && !m.body.startsWith("🎬") && (
          <p className="whitespace-pre-wrap break-words">{m.body}</p>
        )}
      </div>
    );
  }

  return <p className="whitespace-pre-wrap break-words">{m.body}</p>;
}

function formatAudioTime(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0:00";
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function AudioMessage({
  src,
  label,
  outbound,
}: {
  src: string;
  label?: string | null;
  outbound: boolean;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      void audio.play();
    } else {
      audio.pause();
    }
  }

  function seek(value: number) {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = value;
    setCurrent(value);
  }

  return (
    <div className="min-w-[280px] max-w-[340px]">
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
        onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
      />
      <div
        className={cn(
          "rounded-xl border p-3",
          outbound
            ? "border-chat-outbound-foreground/15 bg-chat-outbound-foreground/10"
            : "border-border/60 bg-background/45",
        )}
      >
        <div className="mb-3 flex items-center gap-2">
          <div
            className={cn(
              "grid h-8 w-8 place-items-center rounded-md",
              outbound ? "bg-chat-outbound-foreground/15" : "bg-brand/10 text-brand",
            )}
          >
            <Mic2 className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold">
              {label?.replace(/^🎤\s*/, "") || "Audio"}
            </p>
            <p className={cn("text-[11px]", outbound ? "text-chat-outbound-meta" : "text-muted-foreground")}>
              Mensagem de voz
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggle}
            className={cn(
              "grid h-10 w-10 shrink-0 place-items-center rounded-full transition-transform active:scale-95",
              outbound ? "bg-chat-outbound-foreground/15" : "bg-brand text-brand-foreground",
            )}
            aria-label={playing ? "Pausar audio" : "Reproduzir audio"}
          >
            {playing ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}
          </button>
          <div className="min-w-0 flex-1">
            <input
              type="range"
              min={0}
              max={duration || 1}
              step={0.1}
              value={Math.min(current, duration || current)}
              onChange={(e) => seek(Number(e.target.value))}
              className="h-1.5 w-full accent-brand"
            />
            <div className={cn("mt-1 flex justify-between text-[11px]", outbound ? "text-chat-outbound-meta" : "text-muted-foreground")}>
              <span>{formatAudioTime(current)}</span>
              <span>{formatAudioTime(duration)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MessageStatusLabel({ status }: { status: string }) {
  if (status === "pending") {
    return <span className="opacity-80">enviando…</span>;
  }
  if (status === "failed") {
    return <span className="font-medium text-red-200 dark:text-red-300">falhou</span>;
  }
  if (status === "read") {
    return (
      <span className="inline-flex items-center gap-0.5 font-medium">
        <CheckCheck className="h-3.5 w-3.5" aria-hidden />
        visualizado
      </span>
    );
  }
  if (status === "delivered") {
    return (
      <span className="inline-flex items-center gap-0.5">
        <CheckCheck className="h-3.5 w-3.5 opacity-90" aria-hidden />
        entregue
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5">
      <Check className="h-3.5 w-3.5 opacity-90" aria-hidden />
      enviado
    </span>
  );
}

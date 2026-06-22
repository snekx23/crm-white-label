"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  Send,
  User,
  Loader2,
  Mic2,
  Pause,
  Play,
  Check,
  CheckCheck,
  ChevronDown,
  Paperclip,
  Mic,
  Trash2,
  FileIcon,
  Bot,
  BotOff,
} from "lucide-react";
import type { QuickMessage } from "@/lib/supabase/database.types";
import { QuickRepliesPicker } from "@/components/chat/quick-replies-picker";
import { createClient } from "@/lib/supabase/client";
import { fetchMessages } from "@/lib/chat/client";
import type { ChatMessage, ConversationStatus } from "@/lib/chat/types";
import { CONVERSATION_STATUSES, STATUS_META } from "@/lib/chat/status";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn, initials } from "@/lib/utils";
import { displayLeadName, displayLeadSubtitle } from "@/lib/leads/display";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LeadDeleteButton } from "@/components/leads/lead-delete-button";
import {
  sendChatMessage,
  sendChatMedia,
  markConversationRead,
  setConversationStatusByLead,
  setLeadAutomations,
} from "../actions";

type MediaKind = "image" | "video" | "audio" | "document";

function detectMediaKind(mime: string): MediaKind {
  if (mime.startsWith("image")) return "image";
  if (mime.startsWith("video")) return "video";
  if (mime.startsWith("audio")) return "audio";
  return "document";
}

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
  tenantId,
  leadName,
  leadPhone,
  conversationId: initialConversationId,
  initialStatus = "nao_iniciada",
  initialAutomationsEnabled = true,
  initialMessages,
  quickMessages = [],
}: {
  leadId: string;
  tenantId: string;
  leadName: string;
  leadPhone: string;
  conversationId: string | null;
  initialStatus?: ConversationStatus;
  initialAutomationsEnabled?: boolean;
  initialMessages: ChatMessage[];
  quickMessages?: QuickMessage[];
}) {
  const displayName = displayLeadName(leadName, leadPhone);
  const displayPhone = displayLeadSubtitle(leadPhone);

  const [conversationId, setConversationId] = useState(initialConversationId);
  const [status, setStatus] = useState<ConversationStatus>(initialStatus);
  const [automationsOn, setAutomationsOn] = useState(initialAutomationsEnabled);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [text, setText] = useState("");
  const [pending, start] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordSecs, setRecordSecs] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
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
    setStatus(initialStatus);
    setAutomationsOn(initialAutomationsEnabled);
    setMessages(initialMessages);
    shouldStickToBottomRef.current = true;
    requestAnimationFrame(() => scrollToBottom("auto"));
  }, [leadId, initialConversationId, initialStatus, initialAutomationsEnabled, initialMessages]);

  const toggleAutomations = useCallback(() => {
    setAutomationsOn((prev) => {
      const next = !prev;
      void setLeadAutomations({ leadId, enabled: next }).catch(() => {
        /* mantém otimista */
      });
      return next;
    });
  }, [leadId]);

  const changeStatus = useCallback(
    (next: ConversationStatus) => {
      setStatus(next);
      void setConversationStatusByLead({ leadId, status: next }).catch(() => {
        /* mantém otimista */
      });
    },
    [leadId],
  );

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
    setStatus("aguardando");

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

  const uploadAndSend = useCallback(
    async (file: Blob, fileName: string, kind: MediaKind) => {
      setUploading(true);
      shouldStickToBottomRef.current = true;
      const optimisticId = `opt-${Date.now()}`;
      const localUrl = URL.createObjectURL(file);
      const optimistic: ChatMessage = {
        id: optimisticId,
        body: kind === "document" ? `📎 ${fileName}` : "",
        direction: "outbound",
        created_at: new Date().toISOString(),
        status: "pending",
        media_url: localUrl,
        media_type: kind,
      };
      setMessages((prev) => [...prev, optimistic]);
      setStatus("aguardando");

      try {
        const supabase = createClient();
        const safeName = fileName.replace(/[^\w.\-]+/g, "_");
        const path = `${tenantId}/${leadId}/${crypto.randomUUID()}-${safeName}`;
        const { error: upErr } = await supabase.storage
          .from("chat-media")
          .upload(path, file, {
            cacheControl: "3600",
            upsert: false,
            contentType: file.type || undefined,
          });
        if (upErr) throw new Error(upErr.message);

        const { data: pub } = supabase.storage.from("chat-media").getPublicUrl(path);
        const result = await sendChatMedia({
          leadId,
          mediaUrl: pub.publicUrl,
          mediaKind: kind,
          fileName,
          mimeType: file.type || undefined,
        });
        if (!conversationId) setConversationId(result.conversationId);
        setMessages((prev) => {
          const withoutOpt = prev.filter((m) => m.id !== optimisticId);
          return mergeMessages(withoutOpt, [result.message]);
        });
      } catch (err) {
        setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
        alert((err as Error).message);
      } finally {
        URL.revokeObjectURL(localUrl);
        setUploading(false);
      }
    },
    [tenantId, leadId, conversationId],
  );

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      alert("Arquivo muito grande (máximo 25 MB).");
      return;
    }
    void uploadAndSend(file, file.name, detectMediaKind(file.type));
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      recordChunksRef.current = [];
      mr.ondataavailable = (ev) => {
        if (ev.data.size > 0) recordChunksRef.current.push(ev.data);
      };
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(recordChunksRef.current, { type: "audio/ogg" });
        if (blob.size > 0) void uploadAndSend(blob, `audio-${Date.now()}.ogg`, "audio");
      };
      mediaRecorderRef.current = mr;
      mr.start();
      setRecording(true);
      setRecordSecs(0);
      recordTimerRef.current = setInterval(() => setRecordSecs((s) => s + 1), 1000);
    } catch {
      alert("Não foi possível acessar o microfone. Verifique as permissões do navegador.");
    }
  }

  function stopRecording(cancel = false) {
    const mr = mediaRecorderRef.current;
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    setRecording(false);
    if (!mr) return;
    if (cancel) {
      recordChunksRef.current = [];
      mr.onstop = () => mr.stream.getTracks().forEach((t) => t.stop());
    }
    mr.stop();
    mediaRecorderRef.current = null;
  }

  const busy = pending || uploading;

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
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={toggleAutomations}
            title={automationsOn ? "Automações ligadas — clique para pausar" : "Automações pausadas — clique para ligar"}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors",
              automationsOn
                ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                : "border-border/60 text-muted-foreground hover:bg-muted/40",
            )}
          >
            {automationsOn ? <Bot className="h-3.5 w-3.5" /> : <BotOff className="h-3.5 w-3.5" />}
            {automationsOn ? "Automações" : "Pausadas"}
          </button>
          <StatusSelector status={status} onChange={changeStatus} />
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

      <div className="shrink-0 border-t border-border/50 bg-card/92 px-4 py-3 backdrop-blur-md sm:px-6">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip"
          className="hidden"
          onChange={onPickFile}
        />

        {recording ? (
          <div className="mx-auto flex max-w-3xl items-center gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3">
            <span className="flex h-3 w-3 items-center justify-center">
              <span className="h-3 w-3 animate-pulse rounded-full bg-red-500" />
            </span>
            <span className="font-mono text-sm font-medium text-red-600 dark:text-red-400">
              Gravando… {Math.floor(recordSecs / 60)}:{(recordSecs % 60).toString().padStart(2, "0")}
            </span>
            <div className="ml-auto flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-xl text-muted-foreground"
                onClick={() => stopRecording(true)}
                title="Cancelar"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="brand"
                size="icon"
                className="h-10 w-10 rounded-xl"
                onClick={() => stopRecording(false)}
                title="Enviar áudio"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mx-auto flex max-w-3xl items-end gap-2">
            <QuickRepliesPicker
              messages={quickMessages}
              disabled={busy}
              onPick={(body) => setText((prev) => (prev.trim() ? `${prev.trim()}\n\n${body}` : body))}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-12 w-11 shrink-0 rounded-xl text-muted-foreground hover:text-foreground"
              onClick={() => fileInputRef.current?.click()}
              disabled={busy}
              title="Anexar arquivo"
            >
              {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Paperclip className="h-5 w-5" />}
            </Button>
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
            {text.trim() ? (
              <Button
                type="submit"
                variant="brand"
                size="icon"
                className="h-12 w-12 shrink-0 rounded-xl"
                disabled={busy}
              >
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            ) : (
              <Button
                type="button"
                variant="brand"
                size="icon"
                className="h-12 w-12 shrink-0 rounded-xl"
                onClick={startRecording}
                disabled={busy}
                title="Gravar áudio"
              >
                <Mic className="h-5 w-5" />
              </Button>
            )}
          </form>
        )}
      </div>
    </section>
  );
}

function StatusSelector({
  status,
  onChange,
}: {
  status: ConversationStatus;
  onChange: (next: ConversationStatus) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const meta = STATUS_META[status];
  const Icon = meta.icon;

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors",
          meta.pill,
        )}
      >
        <Icon className="h-3.5 w-3.5" />
        {meta.label}
        <ChevronDown className="h-3.5 w-3.5 opacity-70" />
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1.5 w-52 overflow-hidden rounded-xl border border-border/60 bg-popover p-1 shadow-elev-2">
          {CONVERSATION_STATUSES.map((s) => {
            const ItemIcon = s.icon;
            const activeItem = s.value === status;
            return (
              <button
                key={s.value}
                type="button"
                onClick={() => {
                  onChange(s.value);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors hover:bg-muted/60",
                  activeItem && "bg-muted/40",
                )}
              >
                <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", s.dot)} />
                <ItemIcon className={cn("h-4 w-4 shrink-0", s.text)} />
                <span className="flex-1">{s.label}</span>
                {activeItem && <Check className="h-4 w-4 text-brand" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
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

  if (url && (type === "document" || type.startsWith("application"))) {
    const label = m.body?.replace(/^📎\s*/, "") || "Documento";
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "flex items-center gap-2.5 rounded-lg border px-3 py-2 transition-colors",
          m.direction === "outbound"
            ? "border-chat-outbound-foreground/20 hover:bg-chat-outbound-foreground/10"
            : "border-border/60 hover:bg-muted/50",
        )}
      >
        <FileIcon className="h-5 w-5 shrink-0 opacity-80" />
        <span className="truncate text-sm font-medium underline-offset-2 hover:underline">{label}</span>
      </a>
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

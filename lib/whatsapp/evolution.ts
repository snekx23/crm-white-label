import type { WhatsAppAccount } from "@/lib/supabase/database.types";
import type {
  InboundNormalized,
  SendMediaInput,
  SendMessageInput,
  SendMessageResult,
  SendTemplateInput,
  WhatsAppProvider,
} from "./provider";

interface EvolutionCredentials {
  base_url: string;
  api_key: string;
  instance: string;
}

export class EvolutionProvider implements WhatsAppProvider {
  readonly kind = "evolution" as const;
  constructor(private account: WhatsAppAccount) {}

  private get creds(): EvolutionCredentials {
    return this.account.credentials as unknown as EvolutionCredentials;
  }

  async send(input: SendMessageInput): Promise<SendMessageResult> {
    const url = `${this.creds.base_url.replace(/\/$/, "")}/message/sendText/${this.creds.instance}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { apikey: this.creds.api_key, "Content-Type": "application/json" },
      body: JSON.stringify({
        number: input.to.replace(/\D/g, ""),
        text: input.body ?? "",
      }),
    });
    const data = (await res.json()) as { key?: { id?: string } };
    if (!res.ok) return { externalId: "", status: "failed", raw: data };
    return { externalId: data.key?.id ?? "", status: "sent", raw: data };
  }

  async sendMedia(input: SendMediaInput): Promise<SendMessageResult> {
    const base = this.creds.base_url.replace(/\/$/, "");
    const number = input.to.replace(/\D/g, "");
    let url: string;
    let payload: Record<string, unknown>;

    if (input.mediaKind === "audio") {
      url = `${base}/message/sendWhatsAppAudio/${this.creds.instance}`;
      payload = { number, audio: input.mediaUrl };
    } else {
      url = `${base}/message/sendMedia/${this.creds.instance}`;
      payload = {
        number,
        mediatype: input.mediaKind, // image | video | document
        media: input.mediaUrl,
        ...(input.caption ? { caption: input.caption } : {}),
        ...(input.fileName ? { fileName: input.fileName } : {}),
        ...(input.mimeType ? { mimetype: input.mimeType } : {}),
      };
    }

    const res = await fetch(url, {
      method: "POST",
      headers: { apikey: this.creds.api_key, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await res.json()) as { key?: { id?: string } };
    if (!res.ok) return { externalId: "", status: "failed", raw: data };
    return { externalId: data.key?.id ?? "", status: "sent", raw: data };
  }

  /** Evolution: envia como texto (sem HSM Meta). Junta variáveis do template. */
  async sendTemplate(input: SendTemplateInput): Promise<SendMessageResult> {
    const text = [`[${input.templateName}]`, ...input.bodyParameters].filter(Boolean).join("\n");
    return this.send({ to: input.to, body: text });
  }

  parseWebhook(payload: unknown): InboundNormalized[] {
    const p = payload as {
      event?: string;
      data?: {
        key?: { id?: string; remoteJid?: string; fromMe?: boolean };
        message?: { conversation?: string; extendedTextMessage?: { text?: string } };
        pushName?: string;
        messageTimestamp?: number;
      };
    };
    if (p.event !== "messages.upsert" || !p.data) return [];
    const remote = p.data.key?.remoteJid ?? "";
    if (!remote || remote.includes("@g.us")) return [];
    const fromPhone = remote.split("@")[0]?.replace(/\D/g, "") ?? "";
    if (!fromPhone) return [];
    const fromMe = Boolean(p.data.key?.fromMe);

    // Tentar pegar o texto da conversa
    let body = p.data.message?.conversation ?? p.data.message?.extendedTextMessage?.text;
    let mediaType: string | undefined = undefined;
    let mediaUrl: string | undefined = undefined;

    // Se não houver texto, validar se é uma mensagem de mídia (como áudio) para não descartá-la
    if (!body?.trim()) {
      const msgObj = p.data.message as any;
      if (msgObj?.audioMessage) {
        body = "🎤 Áudio";
        mediaType = "audio";
        mediaUrl = msgObj.audioMessage.url || msgObj.audioMessage.directPath || undefined;
      } else if (msgObj?.imageMessage) {
        body = "📷 Imagem";
        mediaType = "image";
        mediaUrl = msgObj.imageMessage.url || msgObj.imageMessage.directPath || undefined;
      } else if (msgObj?.videoMessage) {
        body = "🎬 Vídeo";
        mediaType = "video";
        mediaUrl = msgObj.videoMessage.url || msgObj.videoMessage.directPath || undefined;
      } else if (msgObj?.documentMessage) {
        body = "📎 Documento";
        mediaType = "document";
        mediaUrl = msgObj.documentMessage.url || msgObj.documentMessage.directPath || undefined;
      } else if (msgObj?.stickerMessage) {
        body = "🎭 Figurinha";
        mediaType = "sticker";
        mediaUrl = msgObj.stickerMessage.url || msgObj.stickerMessage.directPath || undefined;
      } else {
        // Sem texto e sem mídia identificável (ex: eventos de ruído, reações, etc), ignorar
        return [];
      }
    }

    const messageObj = p.data.message as any;
    let normalizedReferral = null;
    const rawReferral = messageObj?.referral ?? messageObj?.extendedTextMessage?.contextInfo?.externalAdReply;
    if (rawReferral && (rawReferral.sourceId || rawReferral.source_id)) {
      normalizedReferral = {
        sourceId: String(rawReferral.sourceId ?? rawReferral.source_id),
        sourceType: String(rawReferral.sourceType ?? rawReferral.source_type ?? "ad"),
        sourceUrl: rawReferral.sourceUrl ?? rawReferral.source_url ?? undefined,
        headline: rawReferral.headline ?? undefined,
        body: rawReferral.body ?? undefined,
        mediaType: rawReferral.mediaType ?? rawReferral.media_type ?? undefined,
        imageUrl: rawReferral.imageUrl ?? rawReferral.image_url ?? undefined,
        videoUrl: rawReferral.videoUrl ?? rawReferral.video_url ?? undefined,
      };
    }

    return [
      {
        externalId: p.data.key?.id ?? "",
        fromPhone,
        toPhone: "",
        direction: fromMe ? "outbound" : "inbound",
        body: body.trim(),
        mediaType,
        mediaUrl,
        timestamp: p.data.messageTimestamp
          ? new Date(p.data.messageTimestamp * 1000).toISOString()
          : new Date().toISOString(),
        contactName: p.data.pushName,
        referral: normalizedReferral,
      },
    ];
  }
}

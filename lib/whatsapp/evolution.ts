import type { WhatsAppAccount } from "@/lib/supabase/database.types";
import type {
  InboundNormalized,
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
    const body = p.data.message?.conversation ?? p.data.message?.extendedTextMessage?.text;
    if (!body?.trim()) return [];
    return [
      {
        externalId: p.data.key?.id ?? "",
        fromPhone,
        toPhone: "",
        direction: fromMe ? "outbound" : "inbound",
        body: body.trim(),
        timestamp: p.data.messageTimestamp
          ? new Date(p.data.messageTimestamp * 1000).toISOString()
          : new Date().toISOString(),
        contactName: p.data.pushName,
      },
    ];
  }
}

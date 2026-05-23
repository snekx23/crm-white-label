import type { ZapiWebhookPayload } from "./zapi";

export function unwrapZapiPayloadForLog(payload: unknown): ZapiWebhookPayload | null {
  if (!payload || typeof payload !== "object") return null;
  const p = payload as Record<string, unknown>;
  if (Array.isArray(payload)) {
    const first = payload[0];
    return first && typeof first === "object" ? (first as ZapiWebhookPayload) : null;
  }
  if (p.data && typeof p.data === "object") return p.data as ZapiWebhookPayload;
  return payload as ZapiWebhookPayload;
}

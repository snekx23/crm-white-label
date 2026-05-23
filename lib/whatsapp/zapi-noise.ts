import type { ZapiWebhookPayload } from "./zapi";

/** Eventos Z-API que não devem virar lead/conversa no CRM. */
export function isZapiStatusOrBroadcastNoise(p: ZapiWebhookPayload): boolean {
  if (p.isStatusReply) return true;

  const ext = p as ZapiWebhookPayload & { statusImage?: unknown };
  if (ext.statusImage && typeof ext.statusImage === "object") return true;

  const phone = typeof p.phone === "string" ? p.phone.toLowerCase() : "";
  if (phone.includes("broadcast") || phone.includes("@newsletter") || phone.includes("status@")) {
    return true;
  }

  return false;
}

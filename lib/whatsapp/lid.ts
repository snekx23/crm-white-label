/** Normaliza identificador @lid do WhatsApp (ex.: 232899248934947@lid). */
export function normalizeWhatsAppLid(raw: string | null | undefined): string | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  const t = raw.trim();
  if (!t.includes("lid")) return null;
  if (t.includes("@lid")) return t;
  const digits = t.replace(/\D/g, "");
  if (digits.length >= 8) return `${digits}@lid`;
  return null;
}

export function isWhatsAppLid(value: string | null | undefined): boolean {
  return normalizeWhatsAppLid(value) !== null;
}

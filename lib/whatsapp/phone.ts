/** Valida telefone brasileiro para WhatsApp (12–13 dígitos, DDI 55). */
export function isValidBrazilWhatsAppPhone(phone: string): boolean {
  const n = phone.replace(/\D/g, "");
  if (n.length < 12 || n.length > 13) return false;
  if (!n.startsWith("55")) return false;

  const ddd = Number(n.slice(2, 4));
  if (ddd < 11 || ddd > 99) return false;

  const local = n.slice(4);
  if (local.length === 9 && local[0] === "9") return true;
  if (local.length === 8) return true;
  return false;
}

/** Normaliza telefone para WhatsApp (DDI + número). Retorna vazio se inválido. */
export function normalizeWhatsAppPhone(phone: string, defaultCountryCode = "55"): string {
  const raw = phone.trim();
  if (!raw || raw.includes("@lid") || raw.includes("@")) return "";

  let digits = raw.replace(/\D/g, "");
  if (!digits) return "";

  if (digits.startsWith("0")) digits = digits.replace(/^0+/, "");

  // IDs longos do WhatsApp (LID sem @) — não são telefone
  if (digits.length > 13) return "";

  const cc = defaultCountryCode.replace(/\D/g, "");
  if (cc && !digits.startsWith(cc) && digits.length >= 10 && digits.length <= 11) {
    digits = cc + digits;
  }

  return isValidBrazilWhatsAppPhone(digits) ? digits : "";
}

/** Chaves equivalentes para buscar o mesmo número no banco. */
export function phoneMatchKeys(phone: string): string[] {
  const canonical = normalizeWhatsAppPhone(phone);
  if (!canonical) return [];

  const keys = new Set<string>([canonical]);
  keys.add(canonical.slice(2));
  keys.add(canonical.slice(-11));
  if (canonical.length >= 10) keys.add(canonical.slice(-10));
  return [...keys];
}

export function phonesEquivalent(a: string, b: string): boolean {
  if (!a || !b) return false;
  const ka = new Set(phoneMatchKeys(a));
  return phoneMatchKeys(b).some((k) => ka.has(k));
}

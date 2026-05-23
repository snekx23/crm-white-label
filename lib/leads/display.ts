import { formatPhoneBR } from "@/lib/utils";
import { isValidBrazilWhatsAppPhone } from "@/lib/whatsapp/phone";

/** Nome amigável para exibição (evita "Lead 182210263023778"). */
export function displayLeadName(name: string | null | undefined, phone?: string | null): string {
  const n = (name ?? "").trim();
  if (/^Lead \d{10,}$/i.test(n)) {
    if (phone && isValidBrazilWhatsAppPhone(phone)) return formatPhoneBR(phone);
    return "Contato WhatsApp";
  }
  if (!n) {
    if (phone && isValidBrazilWhatsAppPhone(phone)) return formatPhoneBR(phone);
    return "Contato";
  }
  return n;
}

export function displayLeadSubtitle(phone: string | null | undefined): string {
  if (!phone) return "Sem telefone";
  if (isValidBrazilWhatsAppPhone(phone)) return formatPhoneBR(phone);
  return "Número oculto pelo WhatsApp";
}

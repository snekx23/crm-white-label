import type { WhatsAppAccount } from "@/lib/supabase/database.types";
import { normalizeWhatsAppLid } from "./lid";
import { normalizeWhatsAppPhone, phonesEquivalent } from "./phone";

type AccountCreds = {
  owner_whatsapp_lid?: string | null;
};

export function getAccountOwnerLid(account: WhatsAppAccount): string | null {
  const creds = account.credentials as AccountCreds | null;
  const lid = creds?.owner_whatsapp_lid;
  return lid ? normalizeWhatsAppLid(lid) : null;
}

/** Contato é o próprio número/LID da instância (ex.: "mensagem para mim"). */
export function isSelfWhatsAppContact(
  account: WhatsAppAccount,
  contact: { phone?: string | null; lid?: string | null },
): boolean {
  const connected = normalizeWhatsAppPhone(account.phone_number ?? "");
  if (contact.phone && connected && phonesEquivalent(contact.phone, connected)) {
    return true;
  }

  const ownerLid = getAccountOwnerLid(account);
  const contactLid = contact.lid ? normalizeWhatsAppLid(contact.lid) : null;
  if (ownerLid && contactLid && ownerLid === contactLid) {
    return true;
  }

  return false;
}

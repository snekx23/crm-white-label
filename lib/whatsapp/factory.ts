import type { WhatsAppAccount } from "@/lib/supabase/database.types";
import type { WhatsAppProvider } from "./provider";
import { CloudApiProvider } from "./cloud-api";
import { EvolutionProvider } from "./evolution";
import { ZapiProvider } from "./zapi";

export function createProvider(account: WhatsAppAccount): WhatsAppProvider {
  switch (account.provider) {
    case "cloud_api":
      return new CloudApiProvider(account);
    case "evolution":
      return new EvolutionProvider(account);
    case "zapi":
      return new ZapiProvider(account);
    default:
      throw new Error(`Provider WhatsApp nao suportado: ${account.provider}`);
  }
}

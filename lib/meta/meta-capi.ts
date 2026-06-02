export interface MetaCapiParams {
  pixelId: string;
  accessToken: string;
  eventName: "Purchase" | "Lead";
  phone?: string | null;
  email?: string | null;
  valueCents?: number | null;
  adId?: string | null;
  clientIp?: string | null;
  userAgent?: string | null;
}

async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message.trim().toLowerCase());
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function sendMetaConversionEvent(params: MetaCapiParams) {
  const { pixelId, accessToken, eventName, phone, email, valueCents, adId, clientIp, userAgent } = params;

  if (!pixelId || !accessToken) {
    console.warn("Meta CAPI Warning: Pixel ID or Access Token is missing");
    return;
  }

  const userData: Record<string, any> = {};

  if (phone) {
    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone) {
      // O Meta exige que o telefone comece com o DDI (ex: 55 para o Brasil)
      // Se não tiver, adicionamos 55 se o tamanho for compatível com BR
      let formattedPhone = cleanPhone;
      if (cleanPhone.length >= 10 && !cleanPhone.startsWith("55")) {
        formattedPhone = "55" + cleanPhone;
      }
      userData.ph = await sha256(formattedPhone);
    }
  }

  if (email) {
    const cleanEmail = email.trim().toLowerCase();
    if (cleanEmail) {
      userData.em = await sha256(cleanEmail);
    }
  }

  if (clientIp) {
    userData.client_ip_address = clientIp;
  }
  if (userAgent) {
    userData.client_user_agent = userAgent;
  }

  const value = valueCents ? valueCents / 100 : 0;

  const eventData = {
    event_name: eventName,
    event_time: Math.floor(Date.now() / 1000),
    user_data: userData,
    custom_data: {
      currency: "BRL",
      value: value,
      ...(adId ? { meta_ad_id: adId } : {}),
    },
    action_source: "physical_store", // offline event source
    event_source_url: "",
  };

  const url = `https://graph.facebook.com/v19.0/${pixelId}/events`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: [eventData],
        access_token: accessToken,
      }),
    });

    const result = (await response.json()) as Record<string, unknown>;
    if (!response.ok) {
      console.error("Meta CAPI Request Failed:", result);
    } else {
      console.log("Meta CAPI Success:", result);
    }
    return result;
  } catch (error) {
    console.error("Meta CAPI Error sending event:", error);
  }
}

export type DbMessageStatus = "pending" | "sent" | "delivered" | "read" | "failed";

export type ZapiMessageStatusUpdate = {
  externalIds: string[];
  status: DbMessageStatus;
};

const STATUS_RANK: Record<DbMessageStatus, number> = {
  failed: -1,
  pending: 0,
  sent: 1,
  delivered: 2,
  read: 3,
};

export function shouldUpgradeMessageStatus(
  current: DbMessageStatus | null | undefined,
  next: DbMessageStatus,
): boolean {
  const curRank = STATUS_RANK[current ?? "pending"] ?? 0;
  const nextRank = STATUS_RANK[next] ?? 0;
  return nextRank > curRank;
}

export function zapiEventToDeliveryStatus(
  raw?: string | null,
): "sent" | "delivered" | "read" | undefined {
  const mapped = raw ? mapZapiStatus(raw) : null;
  if (!mapped || mapped === "failed" || mapped === "pending") return undefined;
  return mapped;
}

function mapZapiStatus(raw: string): DbMessageStatus | null {
  switch (raw.trim().toUpperCase()) {
    case "SENT":
      return "sent";
    case "RECEIVED":
      return "delivered";
    case "READ":
    case "READ_BY_ME":
    case "PLAYED":
      return "read";
    default:
      return null;
  }
}

function unwrapPayload(payload: unknown): Record<string, unknown> | null {
  if (!payload || typeof payload !== "object") return null;
  const p = payload as Record<string, unknown>;
  if (Array.isArray(payload)) {
    const first = payload[0];
    return first && typeof first === "object" ? (first as Record<string, unknown>) : null;
  }
  if (p.data && typeof p.data === "object") return p.data as Record<string, unknown>;
  return p;
}

/** Converte MessageStatusCallback da Z-API em atualizações de status no banco. */
export function parseZapiMessageStatusUpdates(payload: unknown): ZapiMessageStatusUpdate[] {
  const p = unwrapPayload(payload);
  if (!p) return [];

  const type = typeof p.type === "string" ? p.type : "";
  if (type !== "MessageStatusCallback") return [];

  const mapped = mapZapiStatus(typeof p.status === "string" ? p.status : "");
  if (!mapped) return [];

  const idsRaw = p.ids ?? p.messageId;
  const externalIds: string[] = [];
  if (Array.isArray(idsRaw)) {
    for (const id of idsRaw) {
      if (typeof id === "string" && id.trim()) externalIds.push(id.trim());
    }
  } else if (typeof idsRaw === "string" && idsRaw.trim()) {
    externalIds.push(idsRaw.trim());
  }

  if (externalIds.length === 0) return [];
  return [{ externalIds, status: mapped }];
}

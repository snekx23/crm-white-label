/** Início e fim do dia civil em Brasília (America/Sao_Paulo). */
export function getBRTDayBounds(date = new Date()) {
  const dateStr = date.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  const start = new Date(`${dateStr}T00:00:00-03:00`);
  const end = new Date(`${dateStr}T23:59:59.999-03:00`);
  return { dateStr, startIso: start.toISOString(), endIso: end.toISOString() };
}

export function getBRTYesterdayBounds(date = new Date()) {
  const yesterday = new Date(date.getTime() - 24 * 60 * 60 * 1000);
  return getBRTDayBounds(yesterday);
}

export function formatBRTDateLong(date = new Date()) {
  return date.toLocaleDateString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatBRTTime(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
  });
}

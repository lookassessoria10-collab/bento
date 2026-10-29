// Datas: armazenadas em UTC (timestamptz) ou DATE; exibidas no fuso America/Bahia.
export const TIMEZONE = "America/Bahia";

const dateFmt = new Intl.DateTimeFormat("pt-BR", { timeZone: TIMEZONE, day: "2-digit", month: "2-digit", year: "numeric" });
const dateTimeFmt = new Intl.DateTimeFormat("pt-BR", {
  timeZone: TIMEZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});
const isoDateFmt = new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit" });
const monthFmt = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", month: "long", year: "numeric" });

/** Formata DATE (YYYY-MM-DD) sem deslocamento de fuso. */
export function fmtDate(value: string | null | undefined): string {
  if (!value) return "Não informado";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-");
    return `${d}/${m}/${y}`;
  }
  return dateFmt.format(new Date(value));
}

export function fmtDateTime(value: string | null | undefined): string {
  if (!value) return "Não informado";
  return dateTimeFmt.format(new Date(value));
}

/** Data local (America/Bahia) de um instante, em YYYY-MM-DD. */
export function localDate(value: Date | string = new Date()): string {
  return isoDateFmt.format(typeof value === "string" ? new Date(value) : value);
}

export function localMonth(value: Date | string = new Date()): string {
  return localDate(value).slice(0, 7);
}

export function fmtMonth(mes: string): string {
  const [y, m] = mes.split("-").map(Number);
  const s = monthFmt.format(new Date(Date.UTC(y, m - 1, 15)));
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Converte "YYYY-MM-DDTHH:mm" digitado no fuso local (America/Bahia, UTC-3 sem horário de verão) para ISO UTC. */
export function localInputToIso(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) throw new Error("Data e hora inválidas");
  return new Date(`${value}:00-03:00`).toISOString();
}

export function isoToLocalInput(value: string | null | undefined): string {
  if (!value) return "";
  const d = new Date(new Date(value).getTime() - 3 * 3600 * 1000);
  return d.toISOString().slice(0, 16);
}

/** Intervalo [from, to) em UTC que cobre os dias locais (America/Bahia) de startDate a endDate inclusive. */
export function monthBoundsUtc(startDate: string, endDate: string) {
  return {
    from: new Date(`${startDate}T00:00:00-03:00`).toISOString(),
    to: new Date(`${addDays(endDate, 1)}T00:00:00-03:00`).toISOString(),
  };
}

export function fmtBytes(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function fmtNumber(n: number | null | undefined): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("pt-BR").format(n);
}

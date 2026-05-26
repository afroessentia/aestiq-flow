export const fmtDate = (d: string | Date) => {
  const date = typeof d === "string" ? new Date(d + (d.length === 10 ? "T00:00:00" : "")) : d;
  return date.toLocaleDateString("pt-BR");
};

export const fmtTime = (t: string) => t.slice(0, 5);

export const fmtDateTime = (d: string | Date) => {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
};

export const todayISO = () => {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
};

export const addDaysISO = (iso: string, days: number) => {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
};

export const onlyDigits = (s: string) => s.replace(/\D/g, "");

export const waLink = (phone: string, message: string) =>
  `https://wa.me/${onlyDigits(phone)}?text=${encodeURIComponent(message)}`;

export const initials = (name: string) =>
  name.split(" ").filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase()).join("");

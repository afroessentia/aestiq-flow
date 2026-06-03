// Helpers for client birthday calculations.
// birth_date is an ISO date string "YYYY-MM-DD".

function parseISO(date: string): Date {
  return new Date(date + "T00:00:00");
}

/** Next birthday Date relative to `from` (defaults to today). */
export function nextBirthday(birthISO: string, from: Date = new Date()): Date {
  const b = parseISO(birthISO);
  const today = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  let next = new Date(today.getFullYear(), b.getMonth(), b.getDate());
  if (next < today) next = new Date(today.getFullYear() + 1, b.getMonth(), b.getDate());
  return next;
}

/** Days from today until the next birthday, or null if outside window. */
export function upcomingBirthdayDays(birthISO: string, windowDays = 7, from: Date = new Date()): number | null {
  const today = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const next = nextBirthday(birthISO, from);
  const diff = Math.round((next.getTime() - today.getTime()) / 86400000);
  return diff >= 0 && diff <= windowDays ? diff : null;
}

/** Age the client will turn at their next birthday. */
export function turningAge(birthISO: string, from: Date = new Date()): number {
  const b = parseISO(birthISO);
  const next = nextBirthday(birthISO, from);
  return next.getFullYear() - b.getFullYear();
}

export function fmtBirthdayLabel(birthISO: string): string {
  const b = parseISO(birthISO);
  return b.toLocaleDateString("pt-BR", { day: "2-digit", month: "long" });
}

/** Склонение по правилам ru: 1 форма, 2–4 форма, 5+ форма (и 11–19). */
export function pluralizeRussian(count: number, forms: [string, string, string]): string {
  const mod10 = Math.abs(count) % 10;
  const mod100 = Math.abs(count) % 100;
  if (mod100 >= 11 && mod100 <= 19) return forms[2];
  if (mod10 === 1) return forms[0];
  if (mod10 >= 2 && mod10 <= 4) return forms[1];
  return forms[2];
}

export function formatRussianCount(count: number, forms: [string, string, string]): string {
  return `${count} ${pluralizeRussian(count, forms)}`;
}

export function formatVacantSeats(count: number): string {
  return formatRussianCount(count, ['место', 'места', 'мест']);
}

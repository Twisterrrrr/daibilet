export type SeasonalCountdownKind = 'new-year' | 'salute-may9';

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Next 1 January (today if already Jan 1). */
export function resolveNewYearTarget(from = new Date()): Date {
  const year =
    from.getMonth() === 0 && from.getDate() === 1 ? from.getFullYear() : from.getFullYear() + 1;
  return new Date(year, 0, 1);
}

/** Next 9 May (Victory Day salute window). */
export function resolveSaluteMay9Target(from = new Date()): Date {
  const thisYear = new Date(from.getFullYear(), 4, 9);
  if (startOfLocalDay(from).getTime() <= thisYear.getTime()) return thisYear;
  return new Date(from.getFullYear() + 1, 4, 9);
}

export function daysUntilLocal(target: Date, from = new Date()): number {
  const a = startOfLocalDay(from).getTime();
  const b = startOfLocalDay(target).getTime();
  return Math.max(0, Math.round((b - a) / 86_400_000));
}

export function formatDaysRu(days: number): string {
  const n = Math.abs(days) % 100;
  const n1 = n % 10;
  if (n > 10 && n < 20) return `${days} дней`;
  if (n1 === 1) return `${days} день`;
  if (n1 >= 2 && n1 <= 4) return `${days} дня`;
  return `${days} дней`;
}

export function resolveSeasonalCountdownTarget(kind: SeasonalCountdownKind, from = new Date()): Date {
  return kind === 'salute-may9' ? resolveSaluteMay9Target(from) : resolveNewYearTarget(from);
}

export function seasonalCountdownLabel(kind: SeasonalCountdownKind): string {
  return kind === 'salute-may9' ? 'До салюта 9 мая' : 'До Нового года';
}

export function resolveSeasonalCountdownKind(landingSlug: string): SeasonalCountdownKind | null {
  const key = String(landingSlug || '')
    .trim()
    .toLowerCase()
    .replace(/_/g, '-');
  if (key === 'new-year' || key.includes('new-year') || key.includes('novyj-god')) return 'new-year';
  if (key.includes('salute') || key.includes('salyut') || key.includes('9-maya') || key.includes('9-may')) {
    return 'salute-may9';
  }
  return null;
}

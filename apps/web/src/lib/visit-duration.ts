/**
 * Editorial visit duration for hub sights (mustSee / suburb POI).
 * Missing or invalid minutes → hide chip. Do not invent from heuristics.
 */

function pluralRu(n: number, one: string, few: string, many: string): string {
  const abs = Math.abs(n) % 100;
  const d = abs % 10;
  if (abs > 10 && abs < 20) return many;
  if (d === 1) return one;
  if (d >= 2 && d <= 4) return few;
  return many;
}

/** Normalize optional editorial minutes; null if the chip should stay hidden. */
export function normalizeVisitMinutes(raw: unknown): number | null {
  if (raw == null || raw === '') return null;
  const n = typeof raw === 'number' ? raw : Number(String(raw).trim().replace(',', '.'));
  if (!Number.isFinite(n)) return null;
  const rounded = Math.round(n);
  if (rounded < 5 || rounded > 12 * 60) return null;
  return rounded;
}

/** Hub chip: «15 минут», «1 час», «1,5 часа», «2 часа». */
export function formatVisitDuration(raw: unknown): string | null {
  const minutes = normalizeVisitMinutes(raw);
  if (minutes == null) return null;
  if (minutes < 60) {
    return `${minutes} ${pluralRu(minutes, 'минута', 'минуты', 'минут')}`;
  }
  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    return `${hours} ${pluralRu(hours, 'час', 'часа', 'часов')}`;
  }
  if (minutes % 30 === 0) {
    const whole = Math.floor(minutes / 60);
    // 1,5 / 2,5: spoken as "часа"; 5,5 as "часов"
    const word = pluralRu(whole === 1 ? 2 : whole, 'час', 'часа', 'часов');
    return `${whole},5 ${word}`;
  }
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${hours} ${pluralRu(hours, 'час', 'часа', 'часов')} ${rest} ${pluralRu(rest, 'минута', 'минуты', 'минут')}`;
}

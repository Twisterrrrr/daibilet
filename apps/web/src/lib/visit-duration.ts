/**
 * Editorial visit duration for hub sights (mustSee / suburb POI).
 * Missing or invalid → hide chip. Do not invent from heuristics.
 *
 * Chip copy matches hub mock: «15 мин», «1,5 ч», «1-2 ч», «полдня».
 * `visitMinutes` may be a number (minutes) or an editorial label string.
 */

/** ~half day for day-route dwell when chip is «полдня». */
export const HALF_DAY_VISIT_MINUTES = 240;

function cleanLabel(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ');
}

/** Parse editorial string into minutes for day-route dwell; null if unknown. */
function parseEditorialVisitLabel(raw: string): number | null {
  const s = cleanLabel(raw).toLowerCase().replace(/ё/g, 'е');
  if (!s) return null;
  if (s === 'полдня') return HALF_DAY_VISIT_MINUTES;

  const range = s.match(/^(\d+)\s*[-–—]\s*(\d+)\s*ч(?:ас(?:а|ов)?)?\.?$/i);
  if (range) {
    const a = Number(range[1]);
    const b = Number(range[2]);
    if (!Number.isFinite(a) || !Number.isFinite(b) || a < 1 || b < a) return null;
    return Math.round(((a + b) / 2) * 60);
  }

  const half = s.match(/^(\d+)[,.]5\s*ч(?:ас(?:а|ов)?)?\.?$/i);
  if (half) {
    const h = Number(half[1]);
    if (!Number.isFinite(h) || h < 0) return null;
    return h * 60 + 30;
  }

  const hours = s.match(/^(\d+)\s*ч(?:ас(?:а|ов)?)?\.?$/i);
  if (hours) {
    const h = Number(hours[1]);
    if (!Number.isFinite(h) || h < 1) return null;
    return h * 60;
  }

  const mins = s.match(/^(\d+)\s*мин(?:ут[аы]?)?\.?$/i);
  if (mins) {
    const m = Number(mins[1]);
    if (!Number.isFinite(m)) return null;
    return m;
  }

  const n = Number(s.replace(',', '.'));
  if (!Number.isFinite(n)) return null;
  return Math.round(n);
}

function isEditorialChipLabel(raw: string): boolean {
  const s = cleanLabel(raw);
  if (!s) return false;
  if (/^\d+([.,]\d+)?$/.test(s)) return false;
  return /[а-яa-z]/i.test(s);
}

/** Normalize optional editorial minutes; null if the chip should stay hidden. */
export function normalizeVisitMinutes(raw: unknown): number | null {
  if (raw == null || raw === '') return null;
  if (typeof raw === 'string') {
    const parsed = parseEditorialVisitLabel(raw);
    if (parsed == null) return null;
    if (parsed < 5 || parsed > 12 * 60) return null;
    return parsed;
  }
  const n = typeof raw === 'number' ? raw : Number(String(raw).trim().replace(',', '.'));
  if (!Number.isFinite(n)) return null;
  const rounded = Math.round(n);
  if (rounded < 5 || rounded > 12 * 60) return null;
  return rounded;
}

/**
 * Hub chip label.
 * Editorial strings («1-2 ч», «полдня») pass through; numbers → compact «N мин» / «N ч».
 */
export function formatVisitDuration(raw: unknown): string | null {
  if (raw == null || raw === '') return null;
  if (typeof raw === 'string') {
    const label = cleanLabel(raw);
    if (isEditorialChipLabel(label)) {
      const key = label.toLowerCase().replace(/ё/g, 'е');
      if (key === 'полдня') return 'полдня';
      const range = key.match(/^(\d+)\s*[-–—]\s*(\d+)\s*ч(?:ас(?:а|ов)?)?\.?$/);
      if (range) return `${range[1]}-${range[2]} ч`;
      const half = key.match(/^(\d+)[,.]5\s*ч(?:ас(?:а|ов)?)?\.?$/);
      if (half) return `${half[1]},5 ч`;
      const hours = key.match(/^(\d+)\s*ч(?:ас(?:а|ов)?)?\.?$/);
      if (hours) return `${hours[1]} ч`;
      const mins = key.match(/^(\d+)\s*мин(?:ут[аы]?)?\.?$/);
      if (mins) return `${mins[1]} мин`;
      return label;
    }
  }

  const minutes = normalizeVisitMinutes(raw);
  if (minutes == null) return null;
  if (minutes < 60) return `${minutes} мин`;
  if (minutes % 60 === 0) return `${minutes / 60} ч`;
  if (minutes % 30 === 0) {
    const whole = Math.floor(minutes / 60);
    return `${whole},5 ч`;
  }
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${hours} ч ${rest} мин`;
}

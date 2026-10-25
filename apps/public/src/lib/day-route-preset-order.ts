/**
 * Painted walking lines (green/red/blue/…) stay after editorial day scenarios.
 * Hub chips and /my-day empty-state both lead with classic one-day routes.
 */

export type DayRoutePresetOrderable = {
  id?: string;
  title?: string;
};

const PAINTED_LINE_ID_RE =
  /-(?:green|red|blue|purple|violet|yellow|orange|white|black|pink)-line$/i;

/** «Зелёная линия», «Красная линия (романтический…)», «Синяя линия». */
/** No \\b: JS word-boundary is ASCII-only without /u and breaks on Cyrillic. */
const PAINTED_LINE_TITLE_RE =
  /^(зел[её]ная|красная|синяя|фиолетовая|ж[ёе]лтая|оранжевая|белая|ч[ёе]рная|розовая)\s+линия/i;

export function isPaintedWalkingLinePreset(preset: DayRoutePresetOrderable): boolean {
  const id = String(preset.id || '').trim();
  if (PAINTED_LINE_ID_RE.test(id)) return true;
  const title = String(preset.title || '').trim();
  return PAINTED_LINE_TITLE_RE.test(title);
}

/** Stable partition: non-line presets keep relative order, then painted lines. */
export function dayRoutePresetsWithLinesAtTail<T extends DayRoutePresetOrderable>(presets: T[]): T[] {
  if (!presets.length) return presets;
  const core: T[] = [];
  const lines: T[] = [];
  for (const preset of presets) {
    (isPaintedWalkingLinePreset(preset) ? lines : core).push(preset);
  }
  if (!lines.length || !core.length) return presets;
  return [...core, ...lines];
}

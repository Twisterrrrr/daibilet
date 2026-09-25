/** Hub / share CTA that loads a ready list into the My Day planner. */

export const MY_DAY_COLLECT_CTA_LABEL = 'Собрать маршрут';
export const MY_DAY_COLLECT_CTA_ARIA = 'Собрать маршрут в Мой день';

const TOOLTIP_TAIL =
  'в интерактивный планировщик. Вы сможете менять их местами, смотреть на карте и добавлять свои места.';

function theseStopsPhrase(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `эту ${count} точку`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
    return `эти ${count} точки`;
  }
  return `эти ${count} точек`;
}

/**
 * Hover / mobile hint for «Собрать маршрут».
 * Known count interpolates N; unknown omits the number.
 */
export function formatMyDayCollectTooltip(stopCount?: number | null): string {
  const raw = typeof stopCount === 'number' && Number.isFinite(stopCount) ? Math.floor(stopCount) : 0;
  const these = raw > 0 ? theseStopsPhrase(raw) : 'эти точки';
  return `Перенесем ${these} ${TOOLTIP_TAIL}`;
}

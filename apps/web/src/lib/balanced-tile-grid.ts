/**
 * Сетки плиток без «сироты» в последнем ряду.
 * Если count влезает в maxCols — одна строка; иначе выбираем cols,
 * чтобы внизу было ≥2 карточки (не 3+1, не 5+1).
 */

const TAILWIND_COLS: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
  5: 'grid-cols-5',
  6: 'grid-cols-6',
};

export function balancedGridColumnCount(count: number, maxCols: number): number {
  const n = Math.max(0, Math.floor(Number(count) || 0));
  const max = Math.max(1, Math.floor(Number(maxCols) || 1));
  if (n <= 1) return 1;
  if (n <= max) return n;
  for (let cols = max; cols >= 2; cols -= 1) {
    const rem = n % cols;
    if (rem !== 1) return cols;
  }
  // Редкий случай (напр. 7 при max=3): лучше 2 ряда с сиротой, чем 1 колонка.
  return Math.min(max, 2);
}

function prefixedCols(prefix: string, cols: number): string {
  const base = TAILWIND_COLS[cols] || TAILWIND_COLS[1];
  return prefix ? `${prefix}:${base}` : base;
}

/** Tailwind-классы grid-cols-* с префиксами breakpoint. */
export function balancedTileGridClass(
  count: number,
  opts: {
    base?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  },
): string {
  const parts: string[] = [];
  if (opts.base != null) parts.push(prefixedCols('', balancedGridColumnCount(count, opts.base)));
  if (opts.sm != null) parts.push(prefixedCols('sm', balancedGridColumnCount(count, opts.sm)));
  if (opts.md != null) parts.push(prefixedCols('md', balancedGridColumnCount(count, opts.md)));
  if (opts.lg != null) parts.push(prefixedCols('lg', balancedGridColumnCount(count, opts.lg)));
  if (opts.xl != null) parts.push(prefixedCols('xl', balancedGridColumnCount(count, opts.xl)));
  return parts.join(' ');
}

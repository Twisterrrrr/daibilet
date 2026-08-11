import styles from './DaibiletLogo.module.css';

export const DAIBILET_LOGO_BLUE = '#4267e9';
export const DAIBILET_LOGO_DARK = '#101729';

/** Dashed hops start at the й-кратка (over «и») and land on point-2 / point-3. */
const ROUTE_1 = 'M170 42 C215 7 270 7 315 42';
const ROUTE_2 = 'M315 42 C365 8 430 8 475 42';

type DaibiletLogoProps = {
  className?: string;
  textClassName?: string;
  showText?: boolean;
  /** @deprecated Logo is always static (owner: no animation). Kept for call-site compat. */
  animated?: boolean;
};

/**
 * Brand mark: HTML «Даибилет» + SVG route overlay.
 * point-1 is the й-кратка (em-sized circle over «и»); aria / sr-only stay «Дайбилет».
 * Always static final state - no load animation. Mobile: wordmark + point-1 only.
 */
export function DaibiletLogo({
  className = '',
  textClassName = '',
  showText = true,
}: DaibiletLogoProps) {
  if (!showText) return null;

  const rootClass = [styles.logo, className].filter(Boolean).join(' ');

  return (
    <span className={rootClass}>
      <span className="sr-only">Дайбилет</span>
      <span
        className={`${styles.logoText} font-display ${textClassName || 'text-xl sm:text-2xl'}`}
        aria-hidden="true"
      >
        Да
        <span className={styles.logoI}>
          и
          {/*
            point-1 = й-кратка. Em-sized SVG so it stays readable at header sizes;
            the wide route viewBox would shrink a circle to ~2–3px.
          */}
          <svg className={styles.breveMark} viewBox="0 0 12 12" aria-hidden="true">
            <circle className={`${styles.point} ${styles.point1}`} cx="6" cy="6" r="5" />
          </svg>
        </span>
        билет
      </span>
      <svg className={styles.logoRoute} viewBox="0 0 500 95" aria-hidden="true">
        <path className={`${styles.route} ${styles.route1}`} d={ROUTE_1} />
        <path className={`${styles.route} ${styles.route2}`} d={ROUTE_2} />
        <circle className={`${styles.point} ${styles.point2}`} cx="315" cy="42" r="7" />
        <circle className={`${styles.point} ${styles.point3}`} cx="475" cy="42" r="10" />
      </svg>
    </span>
  );
}

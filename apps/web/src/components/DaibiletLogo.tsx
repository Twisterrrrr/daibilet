import styles from './DaibiletLogo.module.css';

/** Legacy export kept for callers; mark is mono black. */
export const DAIBILET_LOGO_BLUE = '#000000';
export const DAIBILET_LOGO_DARK = '#000000';

/**
 * Й-breve as a short solid stroke over «и», then dashed route continues from its right end.
 * viewBox 0 0 500 95; breve centered near x≈170 (letter «и»).
 */
const BREVE_Y = 58;
const BREVE_X1 = 152;
const BREVE_X2 = 188;
/** Slight upward arc (breve), not a flat bar. */
const BREVE_PATH = `M${BREVE_X1} ${BREVE_Y} Q170 52 ${BREVE_X2} ${BREVE_Y}`;
/** Dashed travel arc starts at breve right endpoint → mid waypoint. */
const ROUTE_1 = `M${BREVE_X2} ${BREVE_Y} C220 10 270 -2 315 31`;
const ROUTE_2 = 'M315 31 C365 -3 430 -3 475 31';

/** Destination mark (point-3): half-arm of the blue X at (475, 31). */
const DEST_X = 475;
const DEST_Y = 31;
const DEST_ARM = 9;

type DaibiletLogoProps = {
  className?: string;
  textClassName?: string;
  showText?: boolean;
  /** Kept for API compat; motion is disabled - logo always renders static. */
  animated?: boolean;
};

/**
 * Brand mark: HTML «Даибилет» + SVG route overlay.
 * Solid black breve-stroke over «и» → dashed arc → mid circle → dashed → X (all black, bolder wordmark).
 * Aria / sr-only: «Дайбилет».
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
        Да<span>и</span>билет
      </span>
      <svg className={styles.logoRoute} viewBox="0 0 500 95" aria-hidden="true">
        <path className={styles.breve} d={BREVE_PATH} />
        <path className={`${styles.route} ${styles.route1}`} d={ROUTE_1} />
        <path className={`${styles.route} ${styles.route2}`} d={ROUTE_2} />
        <circle className={`${styles.point} ${styles.point2}`} cx="315" cy="31" r="7" />
        <g className={styles.point3} aria-hidden="true">
          <line
            x1={DEST_X - DEST_ARM}
            y1={DEST_Y - DEST_ARM}
            x2={DEST_X + DEST_ARM}
            y2={DEST_Y + DEST_ARM}
          />
          <line
            x1={DEST_X + DEST_ARM}
            y1={DEST_Y - DEST_ARM}
            x2={DEST_X - DEST_ARM}
            y2={DEST_Y + DEST_ARM}
          />
        </g>
      </svg>
    </span>
  );
}

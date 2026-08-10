import styles from './DaibiletLogo.module.css';

export const DAIBILET_LOGO_BLUE = '#4267e9';
export const DAIBILET_LOGO_DARK = '#000000';

/**
 * Owner sketch: slanted solid bar over «й» is the first dash of the journey.
 * Dashed blue arc starts at the right tip of that bar and continues as one path
 * → mid blue dot → dashed → blue X over «т».
 * viewBox 0 0 500 95; «й»/«и» near x≈165–175.
 */
/** Short solid slanted dash (first segment of the route), over «й». */
const BREVE_X1 = 154;
const BREVE_Y1 = 58;
const BREVE_X2 = 178;
const BREVE_Y2 = 49;
const BREVE_PATH = `M${BREVE_X1} ${BREVE_Y1} L${BREVE_X2} ${BREVE_Y2}`;
/**
 * Dashed arc originates at breve right tip with matching up-right tangent,
 * then rises and lands on the mid waypoint.
 */
const ROUTE_1 = `M${BREVE_X2} ${BREVE_Y2} C208 30 265 -2 315 31`;
const ROUTE_2 = 'M315 31 C365 -3 430 -3 475 31';

/** Destination mark (point-3): half-arm of the blue X at (475, 31) over «т». */
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
 * Black bold wordmark; blue solid first-dash over «й» → dashed blue arc → mid
 * circle → dashed → blue X. Aria / sr-only: «Дайбилет».
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

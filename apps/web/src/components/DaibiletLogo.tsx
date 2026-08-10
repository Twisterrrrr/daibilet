import styles from './DaibiletLogo.module.css';

export const DAIBILET_LOGO_BLUE = '#4267e9';
export const DAIBILET_LOGO_DARK = '#000000';

/**
 * Й-breve: short solid slanted stroke that originates above «и» (not a bar
 * between waypoints), then the dashed route continues from its right end.
 * viewBox 0 0 500 95; letter «и» centered near x≈170.
 */
const BREVE_X1 = 158;
const BREVE_Y1 = 62;
const BREVE_X2 = 182;
const BREVE_Y2 = 50;
/** Short slanted breve over «и», feeding up-right into the dashed arc. */
const BREVE_PATH = `M${BREVE_X1} ${BREVE_Y1} Q170 54 ${BREVE_X2} ${BREVE_Y2}`;
/** Dashed travel arc starts at breve end → mid waypoint. */
const ROUTE_1 = `M${BREVE_X2} ${BREVE_Y2} C225 8 270 -2 315 31`;
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
 * Black wordmark; blue solid breve over «и» → dashed blue arc → mid circle → dashed → blue X.
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

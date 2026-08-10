import styles from './DaibiletLogo.module.css';

export const DAIBILET_LOGO_BLUE = '#4267e9';
export const DAIBILET_LOGO_DARK = '#000000';

/**
 * Owner-approved geometry (annotated sketch with red !!):
 * 1. Short SOLID slanted blue stroke ON «и» = й-кратка AND first dash of the route.
 * 2. Blue dashed arc begins at the RIGHT TIP of that stroke (exact same point)
 *    → mid blue filled circle → dashed → blue X over «т».
 *
 * Two path segments joined at the tip. Dashed segment: dashoffset 0 so the first
 * dash paints AT the tip (never start with a gap floating in empty air).
 *
 * viewBox 0 0 500 95; «и» near x≈155–185.
 */
const BREVE_X1 = 156;
const BREVE_Y1 = 54;
const BREVE_X2 = 182;
const BREVE_Y2 = 44;
const BREVE_D = `M${BREVE_X1} ${BREVE_Y1} L${BREVE_X2} ${BREVE_Y2}`;

/** Dashed continuation from the breve tip; cubic follows up-right breve tangent. */
const ROUTE_1 = `M${BREVE_X2} ${BREVE_Y2} C214 26 268 -2 315 31`;
const ROUTE_2 = 'M315 31 C365 -3 430 -3 475 31';

const MID_X = 315;
const MID_Y = 31;
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
        <path className={styles.breve} d={BREVE_D} />
        <path className={styles.route} d={ROUTE_1} />
        <path className={styles.route} d={ROUTE_2} />
        <circle className={styles.point} cx={MID_X} cy={MID_Y} r="7" />
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

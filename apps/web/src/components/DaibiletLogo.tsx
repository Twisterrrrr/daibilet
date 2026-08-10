import styles from './DaibiletLogo.module.css';

export const DAIBILET_LOGO_BLUE = '#4267e9';
export const DAIBILET_LOGO_DARK = '#101729';

/**
 * Owner sketch (discrete route): dark start circle over «й», blue dashed arcs,
 * mid blue circle, blue X over «т». Restored from 449b279f era; only delta vs
 * screenshot: point-1 raised 2px (cy 60 → 58).
 */
const POINT1_Y = 58;
const ROUTE_1 = `M170 ${POINT1_Y} C215 10 270 -2 315 31`;
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
 * Point-1 (dark navy) is the breve of «й»; mid is a blue circle; end is a blue X.
 * Arcs stay blue dashed. Aria / sr-only: «Дайбилет».
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
        <path className={`${styles.route} ${styles.route1}`} d={ROUTE_1} />
        <path className={`${styles.route} ${styles.route2}`} d={ROUTE_2} />
        <circle className={`${styles.point} ${styles.point1}`} cx="170" cy={POINT1_Y} r="7" />
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

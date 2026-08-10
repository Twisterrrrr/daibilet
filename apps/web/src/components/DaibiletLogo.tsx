import styles from './DaibiletLogo.module.css';

export const DAIBILET_LOGO_BLUE = '#4267e9';
export const DAIBILET_LOGO_DARK = '#101729';

/** Point-1 (breve over «и») sits lower than the mid/end waypoints. */
const POINT1_Y = 48;
const ROUTE_1 = `M170 ${POINT1_Y} C215 -4 270 -4 315 31`;
const ROUTE_2 = 'M315 31 C365 -3 430 -3 475 31';

type DaibiletLogoProps = {
  className?: string;
  textClassName?: string;
  showText?: boolean;
  /** Kept for API compat; motion is disabled - logo always renders static. */
  animated?: boolean;
};

/**
 * Brand mark: HTML «Даибилет» + SVG route overlay.
 * Point-1 (black) is the breve of «й»; other points and arcs stay blue. Aria / sr-only: «Дайбилет».
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
        <circle className={`${styles.point} ${styles.point3}`} cx="475" cy="31" r="10" />
      </svg>
    </span>
  );
}

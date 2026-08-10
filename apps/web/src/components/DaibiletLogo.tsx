import styles from './DaibiletLogo.module.css';

export const DAIBILET_LOGO_BLUE = '#4267e9';
export const DAIBILET_LOGO_DARK = '#101729';

const ROUTE_FULL =
  'M170 31 C215 -4 270 -4 315 31 C365 -3 430 -3 475 31';
const ROUTE_1 = 'M170 31 C215 -4 270 -4 315 31';
const ROUTE_2 = 'M315 31 C365 -3 430 -3 475 31';

type DaibiletLogoProps = {
  className?: string;
  textClassName?: string;
  showText?: boolean;
  /** When false, skip load animation (print, static chrome). */
  animated?: boolean;
};

/**
 * Brand mark: HTML «Даибилет» + SVG route overlay.
 * First blue point is the breve of «й»; aria / sr-only stay «Дайбилет».
 */
export function DaibiletLogo({
  className = '',
  textClassName = '',
  showText = true,
  animated = true,
}: DaibiletLogoProps) {
  if (!showText) return null;

  const rootClass = [
    styles.logo,
    animated ? '' : styles.static,
    className,
  ]
    .filter(Boolean)
    .join(' ');

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
        <circle className={`${styles.point} ${styles.point1}`} cx="170" cy="31" r="7" />
        <circle className={`${styles.point} ${styles.point2}`} cx="315" cy="31" r="7" />
        <circle className={`${styles.point} ${styles.point3}`} cx="475" cy="31" r="10" />
        {animated ? (
          <circle className={styles.pebble} cx="170" cy="31" r="5.5">
            <animateMotion
              path={ROUTE_FULL}
              dur="1.05s"
              begin="0.2s"
              fill="freeze"
              calcMode="linear"
              keyPoints="0;0.5;0.5;1"
              keyTimes="0;0.42;0.52;1"
            />
          </circle>
        ) : null}
      </svg>
    </span>
  );
}

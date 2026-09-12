import styles from './DaibiletLogo.module.css';

export const DAIBILET_LOGO_BLUE = '#3B66F5';
export const DAIBILET_LOGO_DARK = '#0B0F19';

type DaibiletLogoProps = {
  className?: string;
  /** Sets em-based SVG height via Tailwind text-* on the root. */
  textClassName?: string;
  showText?: boolean;
  /** @deprecated Logo is always static. Kept for call-site compat. */
  animated?: boolean;
};

/**
 * Retina SVG wordmark «Дайбилет» - letters only, no dots / routes.
 */
export function DaibiletLogo({
  className = '',
  textClassName = '',
  showText = true,
}: DaibiletLogoProps) {
  if (!showText) return null;

  const rootClass = [styles.logo, textClassName, className].filter(Boolean).join(' ');

  return (
    <span className={rootClass}>
      <span className="sr-only">Дайбилет</span>
      <svg
        className={styles.logoSvg}
        viewBox="0 0 420 110"
        width="100%"
        height="100%"
        aria-hidden="true"
        focusable="false"
      >
        <text className={styles.logoSvgText} x="0" y="82" fontSize="76">
          Дайбилет
        </text>
      </svg>
    </span>
  );
}

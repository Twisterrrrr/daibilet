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
 * Retina-sharp SVG wordmark «Дайбилет».
 * Visual text is «Даибилет»; blue circle is the й-кратка (no routes / animation).
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
        viewBox="0 0 450 150"
        width="100%"
        height="100%"
        aria-hidden="true"
        focusable="false"
      >
        <g transform="translate(20, 20)">
          <circle className={styles.logoDot} cx="112" cy="36" r="11" />
          <text className={styles.logoSvgText} x="0" y="100" fontSize="76">
            Даибилет
          </text>
        </g>
      </svg>
    </span>
  );
}

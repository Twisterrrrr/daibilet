import styles from './DaibiletLogo.module.css';

export const DAIBILET_LOGO_BLUE = '#4267e9';
export const DAIBILET_LOGO_DARK = '#101729';

type DaibiletLogoProps = {
  className?: string;
  textClassName?: string;
  showText?: boolean;
  /** @deprecated Logo is always static. Kept for call-site compat. */
  animated?: boolean;
};

/**
 * Brand wordmark: plain HTML «Дайбилет» (real Cyrillic й).
 * No SVG routes, points, or animation. Link / aria-label live on parent.
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
      <span
        className={`${styles.logoText} font-display ${textClassName || 'text-xl sm:text-2xl'}`}
      >
        Дайбилет
      </span>
    </span>
  );
}

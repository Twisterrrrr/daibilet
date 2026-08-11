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
 * Brand wordmark «Дайбилет»: «и» + bold blue dot as й-кратка.
 * No dashed routes, mid/end points, or animation. Link / aria-label on parent.
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
        Да
        <span className={styles.logoI}>
          и
          <svg className={styles.breveMark} viewBox="0 0 12 12" aria-hidden="true">
            <circle className={styles.dot} cx="6" cy="6" r="5" />
          </svg>
        </span>
        билет
      </span>
    </span>
  );
}

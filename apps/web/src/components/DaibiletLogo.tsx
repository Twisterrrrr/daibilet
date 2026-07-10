export const DAIBILET_LOGO_BLUE = '#4A7FD4';
export const DAIBILET_LOGO_DARK = '#0F172A';

type DaibiletLogoProps = {
  className?: string;
  textClassName?: string;
  showText?: boolean;
};

export function DaibiletLogo({
  className = '',
  textClassName = '',
  showText = true,
}: DaibiletLogoProps) {
  if (!showText) return null;

  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <span
        className={`font-display text-xl font-bold tracking-tight sm:text-2xl ${textClassName}`}
      >
        <span style={{ color: DAIBILET_LOGO_DARK }}>Дай</span>
        <span style={{ color: DAIBILET_LOGO_BLUE }}>билет</span>
      </span>
    </span>
  );
}

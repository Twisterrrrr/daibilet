import * as React from 'react';

/** Фирменный синий логотипа (как на макете). */
export const DAIBILET_LOGO_BLUE = '#4A7FD4';
export const DAIBILET_LOGO_DARK = '#0F172A';
export const DAIBILET_LOGO_YELLOW = '#F5B014';

export function DaibiletLogoMark({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      className={className}
      aria-hidden
    >
      <rect width="48" height="48" rx="11" fill={DAIBILET_LOGO_BLUE} />
      <path
        d="M14 16h20a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H14a2 2 0 0 1-2-2V18a2 2 0 0 1 2-2z"
        fill="#fff"
        opacity="0.95"
      />
      <path
        d="M16 22h16M16 27h11"
        stroke={DAIBILET_LOGO_BLUE}
        strokeWidth="2.2"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="33" cy="30" r="3.5" fill={DAIBILET_LOGO_YELLOW} />
    </svg>
  );
}

type DaibiletLogoProps = {
  className?: string;
  textClassName?: string;
  iconClassName?: string;
  showText?: boolean;
};

export function DaibiletLogo({
  className = '',
  textClassName = '',
  iconClassName = 'h-8 w-8 shrink-0 sm:h-9 sm:w-9',
  showText = true,
}: DaibiletLogoProps) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <DaibiletLogoMark className={iconClassName} />
      {showText ? (
        <span
          className={`font-display text-xl font-bold tracking-tight sm:text-2xl ${textClassName}`}
        >
          <span style={{ color: DAIBILET_LOGO_DARK }}>Дай</span>
          <span style={{ color: DAIBILET_LOGO_BLUE }}>билет</span>
        </span>
      ) : null}
    </span>
  );
}

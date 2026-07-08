import * as React from 'react';

/** Фирменный синий логотипа (как на макете). */
export const DAIBILET_LOGO_BLUE = '#4A7FD4';
export const DAIBILET_LOGO_DARK = '#0F172A';

export function DaibiletLogoMark({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      className={className}
      aria-hidden
    >
      <circle cx="24" cy="24" r="21" fill="#fff" />
      <circle cx="24" cy="24" r="21" fill="none" stroke={DAIBILET_LOGO_BLUE} strokeWidth="3" />
      <path
        d="M24 11.5 33.5 24 24 36.5 14.5 24Z"
        fill="#fff"
        stroke={DAIBILET_LOGO_BLUE}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path
        d="M24 15v18M15 24h18"
        stroke={DAIBILET_LOGO_BLUE}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="24" cy="24" r="2.2" fill={DAIBILET_LOGO_BLUE} />
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

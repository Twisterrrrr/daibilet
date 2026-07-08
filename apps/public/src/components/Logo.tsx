import * as React from 'react';

/** Фирменный синий логотипа (как на макете). */
export const DAIBILET_LOGO_BLUE = '#4A7FD4';
export const DAIBILET_LOGO_DARK = '#0F172A';
export const DAIBILET_LOGO_YELLOW = '#F5B014';

const TICKET_PATH =
  'M11 15h26a2 2 0 0 1 2 2v3.2a2.8 2.8 0 0 0 0 5.6V28a2 2 0 0 1-2 2H11a2 2 0 0 1-2-2v-3.2a2.8 2.8 0 0 0 0-5.6V17a2 2 0 0 1 2-2z';

export function DaibiletLogoMark({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      className={className}
      aria-hidden
    >
      <g transform="rotate(45 24 24)">
        <path d={TICKET_PATH} fill={DAIBILET_LOGO_YELLOW} />
      </g>
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

import type { LandingCardBadge } from '@/lib/landing-card-badges';

const BADGE_CLASS =
  'inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-semibold leading-tight text-primary';

export function LandingCardBadgeRow({
  badges,
  className = '',
}: {
  badges: LandingCardBadge[];
  className?: string;
}) {
  if (!badges.length) return null;
  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`.trim()}>
      {badges.map((badge) => (
        <span key={badge.id} className={BADGE_CLASS}>
          {badge.label}
        </span>
      ))}
    </div>
  );
}

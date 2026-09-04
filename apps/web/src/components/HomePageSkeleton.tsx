/**
 * Brand-tinted home loading shell (primary/sky pulse - not white slabs on dark).
 */
export function HomePageSkeleton() {
  return (
    <div className="pb-24 lg:pb-0" aria-busy="true" aria-label="Загрузка главной">
      {/* Full-bleed search-hero placeholder */}
      <div className="min-h-[320px] animate-pulse bg-gradient-to-br from-[#122868] via-sky-900 to-slate-900 sm:min-h-[380px] lg:min-h-[420px]" />

      <div className="container-page mt-6 space-y-10 lg:mt-10">
        <SectionSkeleton cards={6} />
        <SectionSkeleton cards={4} tall />
        <div className="h-28 animate-pulse rounded-2xl bg-gradient-to-r from-primary-50 via-sky-50 to-primary-50" />
        <SectionSkeleton cards={4} />
        <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
          <div className="min-h-[240px] animate-pulse rounded-2xl bg-primary-100/70" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl bg-sky-50" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionSkeleton({ cards, tall }: { cards: number; tall?: boolean }) {
  return (
    <div>
      <div className="mb-4 h-7 w-48 animate-pulse rounded-lg bg-primary-100/80" />
      <div className="flex gap-3 overflow-hidden sm:grid sm:grid-cols-4 sm:gap-4">
        {Array.from({ length: cards }).map((_, i) => (
          <div
            key={i}
            className={`w-[72%] shrink-0 animate-pulse rounded-2xl bg-gradient-to-br from-sky-50 to-primary-50 sm:w-auto ${
              tall ? 'h-56' : 'h-36'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

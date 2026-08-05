/**
 * Brand-tinted home loading shell (primary/sky pulse - not white slabs on dark).
 */
export function HomePageSkeleton() {
  return (
    <div className="pb-24 lg:pb-0" aria-busy="true" aria-label="Загрузка главной">
      <div className="container-page pt-4 lg:pt-8">
        {/* Mobile stories */}
        <div className="mb-4 flex gap-3 overflow-hidden lg:hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <span
              key={i}
              className="h-16 w-16 shrink-0 animate-pulse rounded-full bg-primary-100/80 ring-2 ring-sky-100"
            />
          ))}
        </div>

        {/* Desktop bento / mobile featured */}
        <div className="grid gap-3 lg:grid-cols-[1.5fr_1fr] lg:gap-4">
          <div className="min-h-[200px] animate-pulse rounded-2xl bg-gradient-to-br from-primary-100 via-sky-100 to-primary-50 sm:min-h-[260px] lg:min-h-[320px]" />
          <div className="hidden min-h-[320px] animate-pulse rounded-2xl bg-gradient-to-br from-sky-100 via-primary-50 to-sky-50 lg:block" />
        </div>

        <div className="mt-5 hidden gap-3 lg:flex">
          {Array.from({ length: 6 }).map((_, i) => (
            <span key={i} className="h-20 w-24 shrink-0 animate-pulse rounded-2xl bg-primary-50" />
          ))}
        </div>
      </div>

      <div className="container-page mt-10 space-y-10">
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

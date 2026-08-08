export function LocationCardSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex items-stretch">
        <div className="size-32 shrink-0 bg-slate-200 sm:size-36" />
        <div className="flex min-w-0 flex-1 flex-col gap-3 p-3.5 sm:p-4">
          <div className="h-3 w-24 rounded bg-slate-100" />
          <div className="h-5 w-3/4 rounded bg-slate-200" />
          <div className="h-4 w-1/2 rounded bg-slate-100" />
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-3.5 py-2.5 sm:px-4">
        <div className="h-7 w-24 rounded-full bg-slate-100" />
        <div className="h-9 w-28 rounded-full bg-slate-200" />
      </div>
    </div>
  );
}

export function InstitutionCardSkeleton() {
  return (
    <div className="flex animate-pulse flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="aspect-[3/4] bg-slate-200 sm:aspect-[2/3]" />
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="h-5 w-4/5 rounded bg-slate-200" />
        <div className="h-4 w-1/2 rounded bg-slate-100" />
        <div className="mt-2 h-8 w-full rounded bg-slate-100" />
        <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-3">
          <div className="h-8 w-24 rounded bg-slate-100" />
          <div className="h-8 w-20 rounded-full bg-slate-200" />
        </div>
      </div>
    </div>
  );
}

export function LocationsCatalogSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {Array.from({ length: count }).map((_, index) => (
        <LocationCardSkeleton key={index} />
      ))}
    </div>
  );
}

export function VenuesCatalogSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, index) => (
        <InstitutionCardSkeleton key={index} />
      ))}
    </div>
  );
}

export function VenueCatalogPageSkeleton({ family }: { family: 'institution' | 'location' }) {
  return (
    <div className="container-page py-8">
      <div className="mb-6 space-y-3">
        <div className="h-8 w-64 animate-pulse rounded-lg bg-slate-200" />
        <div className="h-4 w-96 max-w-full animate-pulse rounded bg-slate-100" />
      </div>
      {family === 'location' ? <LocationsCatalogSkeleton /> : <VenuesCatalogSkeleton />}
    </div>
  );
}

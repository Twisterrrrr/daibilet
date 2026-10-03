import { DayRouteSharePublicActions } from '@/components/DayRouteSharePublicActions.client';
import { SiteLayout } from '@/components/SiteLayout';
import { pluralPoints } from '@/lib/format';
import type { DayRouteSharePublicView as DayRouteSharePublicViewData } from '@/server/day-route-share';

export function DayRouteSharePublicView({
  share,
  heading,
  cityLabel,
}: {
  share: DayRouteSharePublicViewData;
  heading: string;
  cityLabel: string | null;
}) {
  return (
    <SiteLayout footerVariant="compact">
      <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary-700">Мой день</p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
          {heading}
        </h1>
        {cityLabel ? <p className="mt-2 text-base text-slate-600">{cityLabel}</p> : null}

        <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-500">
          <span>{pluralPoints(share.stops.length)}</span>
          <span>·</span>
          <span>{share.hitCount} просмотров</span>
          <span>·</span>
          <span>{share.saveCount} сохранений</span>
          {share.averageRating != null ? (
            <>
              <span>·</span>
              <span>★ {share.averageRating.toFixed(1)}</span>
            </>
          ) : null}
        </div>

        {share.authorName ? (
          <p className="mt-3 text-sm text-slate-600">Автор: {share.authorName}</p>
        ) : null}

        <ol className="mt-8 space-y-3">
          {share.stops.map((stop) => (
            <li
              key={`${stop.index}-${stop.title}`}
              className="flex gap-3 rounded-xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700">
                {stop.index}
              </span>
              <div className="min-w-0">
                <p className="font-medium text-slate-900">{stop.title}</p>
                {stop.timeLabel ? (
                  <p className="mt-0.5 text-sm text-slate-500">{stop.timeLabel}</p>
                ) : null}
              </div>
            </li>
          ))}
        </ol>

        <DayRouteSharePublicActions
          code={share.code}
          citySlug={share.citySlug}
          longPath={share.longPath}
          stops={share.stops}
        />
      </main>
    </SiteLayout>
  );
}

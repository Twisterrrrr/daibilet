import Link from 'next/link';
import type { PublicLandingPageDto } from '@daibilet/contracts/public';

import { EventCard } from '@/components/EventCard';
import { SiteLayout } from '@/components/SiteLayout';
import { formatPriceFrom, pluralEvents } from '@/lib/format';
import { landingCategoryHref } from '@/lib/landing-routes';

export function LandingPageView({ payload }: { payload: PublicLandingPageDto }) {
  const { landing, sessions, relatedLandings } = payload;

  return (
    <SiteLayout>
      <div className="container-page py-8">
        <nav className="text-sm text-slate-500">
          <Link href="/" className="hover:text-primary">
            Главная
          </Link>
          <span className="mx-2">/</span>
          <Link href="/podborki" className="hover:text-primary">
            Подборки
          </Link>
          <span className="mx-2">/</span>
          <span>{landing.title}</span>
        </nav>

        <header className="mt-6">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            {landing.heroTitle || landing.title}
          </h1>
          {landing.subtitle ? (
            <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">{landing.subtitle}</p>
          ) : null}
          <p className="mt-4 text-sm text-slate-500">
            {pluralEvents(sessions.length)}
            {landing.priceFrom ? ` · от ${formatPriceFrom(landing.priceFrom)}` : ''}
          </p>
        </header>

        {sessions.length ? (
          <ul className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {sessions.map((session) => (
              <li key={`${session.id}-${session.startsAt}`}>
                <EventCard session={session} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-8 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-sm text-slate-600">
            Сейчас нет событий по этой подборке. Попробуйте{' '}
            <Link href="/events" className="font-semibold text-primary hover:underline">
              полный каталог
            </Link>
            .
          </p>
        )}

        {relatedLandings.length ? (
          <section className="mt-12">
            <h2 className="text-xl font-bold text-slate-900">Другие подборки</h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {relatedLandings.slice(0, 6).map((item) => (
                <li key={item.slug}>
                  <Link
                    href={landingCategoryHref(item.slug)}
                    className="block rounded-xl border border-slate-200 bg-white p-4 transition hover:border-primary/40 hover:shadow-sm"
                  >
                    <p className="font-semibold text-slate-900">{item.title}</p>
                    {item.subtitle ? <p className="mt-1 text-sm text-slate-500">{item.subtitle}</p> : null}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </SiteLayout>
  );
}

import Link from 'next/link';

import { EventCard } from '@/components/EventCard';
import { LandingContentBlocks, LandingFaqSection } from '@/components/landing/LandingContentBlocks';
import { PageBreadcrumbBar, SectionPageHero } from '@/components/PageBreadcrumbs';
import { SiteLayout } from '@/components/SiteLayout';
import type { PublicLandingPageDto } from '@daibilet/contracts/public';
import { formatPriceFrom, pluralEvents } from '@/lib/format';
import { landingCategoryHref } from '@/lib/landing-routes';

export function LandingPageView({ payload }: { payload: PublicLandingPageDto }) {
  const { landing, sessions, relatedLandings, blocks, stats } = payload;

  return (
    <SiteLayout>
      <PageBreadcrumbBar
        items={[
          { label: 'Главная', href: '/' },
          { label: 'Подборки', href: '/podborki' },
          { label: landing.title },
        ]}
      />
      <SectionPageHero
        breadcrumbs={[]}
        gradientClass="from-primary-800 via-indigo-800 to-slate-900"
        title={landing.heroTitle || landing.title}
        description={landing.subtitle || undefined}
      >
        <p className="mt-4 text-sm text-white/85">
          {pluralEvents(sessions.length)}
          {landing.priceFrom ? ` · от ${formatPriceFrom(landing.priceFrom)}` : ''}
        </p>
      </SectionPageHero>

      <div className="container-page py-8">
        <section id="variants" className="scroll-mt-24">
          {sessions.length ? (
            <ul className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {sessions.map((session) => (
                <li key={`${session.id}-${session.startsAt}`}>
                  <EventCard session={session} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-sm text-slate-600">
              Сейчас нет событий по этой подборке. Попробуйте{' '}
              <Link href="/events" className="font-semibold text-primary hover:underline">
                полный каталог
              </Link>
              .
            </p>
          )}
        </section>

        <LandingContentBlocks blocks={blocks} landing={landing} stats={stats} />
        <LandingFaqSection blocks={blocks} landingTitle={landing.title} />

        {relatedLandings.length ? (
          <section className="mt-12 border-t border-slate-100 pt-10">
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

        <nav className="mt-10 flex flex-wrap gap-4 border-t border-slate-200 pt-8 text-sm">
          <Link href="/events" className="font-medium text-primary hover:underline">
            Полный каталог
          </Link>
          <Link href="/cities" className="font-medium text-primary hover:underline">
            Города
          </Link>
          <Link href="/podborki" className="font-medium text-primary hover:underline">
            Все подборки
          </Link>
        </nav>
      </div>
    </SiteLayout>
  );
}

import * as React from 'react';
import { ArrowRight, CalendarDays, Ship, Sparkles, Ticket, UtensilsCrossed } from 'lucide-react';

import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { formatMoney, formatNumber, publicData } from '@/data';
import { landingPageHref } from '@/lib/landing-slugs';
import type { PublicLanding } from '@/types';

export function LandingsCatalogPage() {
  React.useEffect(() => {
    document.title = 'Подборки — тематические коллекции событий | Дайбилет';
    upsertMeta(
      'description',
      'Тематические подборки экскурсий, музеев и мероприятий: речные прогулки, автобусные туры, праздничные программы и многое другое.',
    );
  }, []);

  const landings = publicData.landings.filter((landing) => landing.events > 0);
  const featured = landings.slice(0, 6);
  const rest = landings.slice(6);

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Header cityLabel="Все города" onSection={navigateFromLandings} />
      <main className="container-page py-10 sm:py-12">
        <nav className="mb-6 flex items-center gap-2 text-sm text-slate-500">
          <a href="/" className="transition-colors hover:text-primary-600">
            Главная
          </a>
          <span>/</span>
          <span className="text-slate-900">Подборки</span>
        </nav>

        <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">Подборки событий</h1>
        <p className="mt-2 max-w-2xl text-lg text-slate-500">
          Тематические коллекции: лучшие экскурсии, музеи и мероприятия, собранные по сезону и формату
        </p>

        {!landings.length ? (
          <div className="mt-12 rounded-xl border border-dashed border-slate-300 bg-slate-50 py-16 text-center">
            <p className="text-lg text-slate-500">Подборки скоро появятся</p>
            <p className="mt-1 text-sm text-slate-400">Мы готовим тематические коллекции событий</p>
          </div>
        ) : (
          <>
            {featured.length ? (
              <section className="mt-10">
                <h2 className="text-xl font-bold text-slate-900">Спецстраницы</h2>
                <p className="mt-1 text-sm text-slate-500">Подборки с отдельной страницей, расписанием и фильтрами</p>
                <div className="mt-4 grid grid-cols-1 gap-3 min-[361px]:grid-cols-2 md:grid-cols-3">
                  {featured.map((landing, index) => (
                    <LandingPromoCard key={landing.slug} landing={landing} index={index} />
                  ))}
                </div>
              </section>
            ) : null}

            {rest.length ? (
              <section className="mt-10">
                <h2 className="text-xl font-bold text-slate-900">Все подборки</h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {rest.map((landing) => (
                    <a
                      key={landing.slug}
                      href={landingPageHref(landing.slug)}
                      className="rounded-xl border border-slate-200 bg-white p-5 transition hover:border-primary-200 hover:shadow-sm"
                    >
                      <h3 className="text-lg font-semibold text-slate-900">{landing.title}</h3>
                      {landing.subtitle ? <p className="mt-1 text-sm text-slate-600">{landing.subtitle}</p> : null}
                      <p className="mt-3 text-sm font-medium text-primary-700">
                        {pluralEvents(landing.events)} · от {formatMoney(landing.priceFrom)}
                      </p>
                    </a>
                  ))}
                </div>
              </section>
            ) : null}
          </>
        )}

        <div className="mt-10">
          <a href="/events" className="inline-flex items-center gap-2 text-sm font-semibold text-primary-700 hover:text-primary-800">
            Смотреть весь каталог <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function LandingPromoCard({ landing, index }: { landing: PublicLanding; index: number }) {
  const Icon = promoIcon(landing.slug, index);
  return (
    <a
      href={landingPageHref(landing.slug)}
      className={`group relative overflow-hidden rounded-xl p-5 text-left text-white shadow-lg transition-transform hover:scale-[1.02] sm:p-6 ${promoGradient(index)}`}
    >
      <Icon className="mb-3 h-8 w-8 opacity-80" />
      <h3 className="text-lg font-bold">{landing.title}</h3>
      {landing.subtitle ? <p className="mt-1 text-sm text-white/80">{landing.subtitle}</p> : null}
      <div className="mt-4 text-sm font-semibold">
        {pluralEvents(landing.events)} · {formatMoney(landing.priceFrom)}
      </div>
      <div className="absolute -bottom-4 -right-4 h-24 w-24 rounded-full bg-white/10 transition-transform group-hover:scale-150" />
    </a>
  );
}

function promoIcon(slug: string, index: number) {
  if (slug.includes('river') || slug.includes('bridge') || slug.includes('boat') || slug.includes('dinner')) return Ship;
  if (slug.includes('bus')) return Ticket;
  if (slug.includes('salute') || slug.includes('new-year')) return Sparkles;
  if (slug.includes('standup')) return UtensilsCrossed;
  if (index % 3 === 1) return CalendarDays;
  return Ship;
}

function promoGradient(index: number): string {
  const gradients = [
    'bg-gradient-to-br from-blue-600 to-cyan-500',
    'bg-gradient-to-br from-violet-600 to-purple-500',
    'bg-gradient-to-br from-amber-500 to-orange-600',
    'bg-gradient-to-br from-emerald-600 to-teal-500',
    'bg-gradient-to-br from-rose-500 to-pink-600',
    'bg-gradient-to-br from-indigo-600 to-blue-700',
  ];
  return gradients[index % gradients.length];
}

function pluralEvents(count: number): string {
  const mod10 = Math.abs(count) % 10;
  const mod100 = Math.abs(count) % 100;
  const word =
    mod100 >= 11 && mod100 <= 19 ? 'событий' : mod10 === 1 ? 'событие' : mod10 >= 2 && mod10 <= 4 ? 'события' : 'событий';
  return `${formatNumber(count)} ${word}`;
}

function navigateFromLandings(section: string) {
  if (section === 'top') window.location.href = '/';
  else if (section === 'events') window.location.href = '/events';
  else if (section === 'cities' || section === 'destinations') window.location.href = '/cities';
  else if (section === 'landings') window.location.href = '/podborki';
  else if (section === 'orders') window.location.href = '/my-orders';
  else if (section === 'blog') window.location.href = '/blog';
  else window.location.href = '/';
}

function upsertMeta(name: string, content: string) {
  let element = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.name = name;
    document.head.appendChild(element);
  }
  element.content = content;
}

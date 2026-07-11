'use client';

import * as React from 'react';
import {
  Car,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  HelpCircle,
  MapPin,
  Navigation as NavigationIcon,
  Share2,
  Ticket,
} from 'lucide-react';

import { InstitutionCard } from '@/components/InstitutionCard.client';
import { OsmMapEmbed } from '@/components/OsmMapEmbed';
import { formatMoney, formatNumber } from '@/lib/format';
import { formatStreetAddress } from '@/lib/address';
import { institutionTypeEmoji, normalizeVenueKind, venueTypeLabel } from '@/lib/venue-meta';
import { eventHref, venueHref } from '@/lib/routes';
import type { PublicSessionDto, PublicVenueDto, PublicVenuePageDto } from '@daibilet/contracts/public';

const FAQ_ITEMS = [
  {
    question: 'Есть ли билеты с открытой датой?',
    answer: 'У многих музеев и выставок бывают билеты без фиксированного сеанса. Это будет указано в карточке события.',
  },
  {
    question: 'Где проходит оплата?',
    answer: 'Покупка — в виджете билетной системы или на сайте организатора. Дайбилет помогает выбрать событие и хранит статус заказа.',
  },
  {
    question: 'Актуальны ли часы работы?',
    answer: 'Мы показываем афишу событий; режим работы учреждения лучше проверить на его официальном сайте.',
  },
];

export function InstitutionVenueLayout({
  venue,
  stats,
  sessions,
  relatedVenues,
}: {
  venue: PublicVenueDto;
  stats: PublicVenuePageDto['stats'];
  sessions: PublicSessionDto[];
  relatedVenues: PublicVenueDto[];
}) {
  const title = venue.seoH1 || venue.title || venue.name;
  const streetAddress = formatStreetAddress(venue.address, { city: venue.city });
  const hasMap = Boolean(venue.latitude && venue.longitude);
  const isTheatre = normalizeVenueKind(venue.type) === 'theater';
  const typeLabel = venueTypeLabel(venue.type);
  const typeEmoji = institutionTypeEmoji(venue.type);
  const intro =
    venue.shortDescription ||
    venue.description ||
    `${venue.name} — ${typeLabel.toLowerCase()} в ${venue.city}. Афиша, билеты и ближайшие сеансы.`;
  const categories = Object.entries(venue.categories || {}).sort((a, b) => b[1] - a[1]);
  const nextSessions = sessions.slice(0, 4);

  const heroGradient = isTheatre
    ? 'bg-gradient-to-r from-rose-900/95 via-slate-900/80 to-slate-900/50'
    : 'bg-gradient-to-t from-slate-900 via-slate-900/70 to-slate-900/30';

  const share = () => {
    if (navigator.share) {
      void navigator.share({ title: venue.name, url: window.location.href });
    } else {
      void navigator.clipboard?.writeText(window.location.href);
    }
  };

  return (
    <div className="bg-slate-50 pb-24 lg:pb-0">
      <div className="border-b border-slate-200 bg-white">
        <div className="container-page flex items-center gap-1.5 py-3 text-sm text-slate-500">
          <a href="/" className="hover:text-primary-600">
            Главная
          </a>
          <ChevronRight className="h-3.5 w-3.5" />
          <a href="/venues" className="hover:text-primary-600">
            Площадки
          </a>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-slate-900">{venue.city}</span>
        </div>
      </div>

      <section className="relative overflow-hidden bg-slate-900 text-white">
        <div className="absolute inset-0">
          {venue.heroImageUrl ? (
            <img src={venue.heroImageUrl} alt="" className="h-full w-full object-cover opacity-40" />
          ) : (
            <div className={`h-full w-full ${isTheatre ? 'bg-gradient-to-br from-rose-800 to-slate-950' : 'bg-gradient-to-br from-indigo-800 to-slate-950'}`} />
          )}
          <div className={`absolute inset-0 ${heroGradient}`} />
        </div>

        <div className="container-page relative py-10 md:py-14">
          <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
            <div className="max-w-2xl">
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">
                  {typeEmoji} {typeLabel}
                </span>
                <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">
                  {formatNumber(stats.events)} в афише
                </span>
              </div>

              <h1 className="mt-4 font-display text-3xl font-extrabold leading-tight sm:text-4xl md:text-5xl">{title}</h1>

              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-white/90">
                {streetAddress ? (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" />
                    {streetAddress}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" />
                    {venue.city}
                  </span>
                )}
              </div>

              <p className="mt-4 max-w-xl text-white/90">{intro}</p>
            </div>

            <div className="flex flex-col items-start gap-2 md:items-end">
              <div className="md:text-right">
                <div className="text-sm text-white/70">Билет от</div>
                <div className="text-3xl font-extrabold">{formatMoney(stats.priceFrom)}</div>
              </div>
              <a
                href="#venue-program"
                className={`inline-flex items-center gap-2 rounded-full px-6 py-3 font-bold shadow-lg transition hover:opacity-95 ${
                  isTheatre ? 'bg-rose-500 text-white hover:bg-rose-600' : 'bg-white text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Ticket className="h-4 w-4" />
                {isTheatre ? 'К афише' : 'Купить билет'}
              </a>
              <button
                type="button"
                onClick={share}
                className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium backdrop-blur hover:bg-white/20"
              >
                <Share2 className="h-3.5 w-3.5" />
                Поделиться
              </button>
            </div>
          </div>
        </div>
      </section>

      <nav className="sticky top-[var(--site-header-height)] z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="container-page flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {[
            ['#venue-program', 'Афиша и билеты'],
            ['#about', 'О месте'],
            ['#practical', 'Адрес и карта'],
            ['#faq', 'Вопросы'],
          ].map(([href, label]) => (
            <a
              key={href}
              href={href}
              className="shrink-0 px-4 py-3 text-sm font-medium text-slate-700 hover:text-primary-600"
            >
              {label}
            </a>
          ))}
        </div>
      </nav>

      <div className="container-page grid grid-cols-[minmax(0,1fr)] gap-8 py-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          {nextSessions.length > 0 ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-xl font-bold text-slate-900">Ближайшие события</h2>
                <a href="#venue-program" className="text-sm font-semibold text-primary-600 hover:underline">
                  Вся афиша →
                </a>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {nextSessions.map((session) => (
                  <a
                    key={session.id}
                    href={eventHref(session)}
                    className="rounded-xl border border-slate-100 bg-slate-50 p-4 transition hover:border-primary/30 hover:bg-primary-50/30"
                  >
                    <div className="font-semibold text-slate-900">{session.title}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {session.dateLabel} · {session.timeLabel} · {formatMoney(session.priceFrom)}
                    </div>
                  </a>
                ))}
              </div>
            </section>
          ) : null}

          <section id="about" className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-xl font-bold text-slate-900">О месте</h2>
            {categories.length > 0 ? (
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {categories.slice(0, 6).map(([name]) => (
                  <div key={name} className="flex items-start gap-2 rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    <span className="text-sm text-slate-800">{name}</span>
                  </div>
                ))}
              </div>
            ) : null}
            {venue.description && venue.description !== intro ? (
              <p className="mt-4 text-sm leading-7 text-slate-600">{venue.description}</p>
            ) : null}
          </section>

          <section id="faq">
            <h2 className="text-xl font-bold text-slate-900">Частые вопросы</h2>
            <div className="mt-4 space-y-2">
              {FAQ_ITEMS.map((item) => (
                <details key={item.question} className="group rounded-xl border border-slate-200 bg-white">
                  <summary className="flex cursor-pointer list-none items-center justify-between p-4">
                    <span className="flex items-center gap-2 font-medium text-slate-900">
                      <HelpCircle className="h-4 w-4 text-primary-600" />
                      {item.question}
                    </span>
                    <ChevronDown className="h-4 w-4 text-slate-400 transition group-open:rotate-180" />
                  </summary>
                  <div className="px-4 pb-4 text-sm text-slate-700">{item.answer}</div>
                </details>
              ))}
            </div>
          </section>

          {relatedVenues.length > 0 ? (
            <section>
              <h2 className="text-xl font-bold text-slate-900">Похожие площадки</h2>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {relatedVenues.slice(0, 4).map((related) => (
                  <InstitutionCard key={related.id} venue={related} href={venueHref(related)} />
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <aside id="practical" className="lg:sticky lg:top-32 lg:self-start">
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="text-sm font-semibold text-slate-900">Как добраться</div>
              <div className="mt-3 space-y-2 text-sm text-slate-700">
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" />
                  {streetAddress || `${venue.city} — адрес уточняется`}
                </div>
                <div className="flex items-start gap-2">
                  <Ticket className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" />
                  {formatNumber(stats.events)} событий · от {formatMoney(stats.priceFrom)}
                </div>
              </div>
              {hasMap ? (
                <a
                  href={`https://yandex.ru/maps/?pt=${venue.longitude},${venue.latitude}&z=17&l=map`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary-600 hover:underline"
                >
                  <NavigationIcon className="h-4 w-4" />
                  Открыть на карте
                </a>
              ) : null}
            </div>

            {hasMap ? (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <OsmMapEmbed
                  lat={venue.latitude!}
                  lng={venue.longitude!}
                  title={`Карта: ${venue.name}`}
                  className="relative h-48 w-full"
                />
                <div className="flex flex-wrap gap-2 p-3">
                  <a
                    href={`https://yandex.ru/maps/?pt=${venue.longitude},${venue.latitude}&z=17&l=map`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-primary-600"
                  >
                    <NavigationIcon className="h-3.5 w-3.5" />
                    Яндекс.Карты
                  </a>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${venue.latitude},${venue.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Car className="h-3.5 w-3.5" />
                    Маршрут
                  </a>
                </div>
              </div>
            ) : null}

            <div className="rounded-2xl border border-sky-100 bg-sky-50 p-5 text-sm text-slate-700">
              Режим работы учреждения и правила посещения уточняйте на официальном сайте площадки, особенно в праздники.
            </div>
          </div>
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 p-3 backdrop-blur lg:hidden">
        <div className="container-page flex items-center justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500">Билет от</div>
            <div className="text-lg font-extrabold text-slate-900">{formatMoney(stats.priceFrom)}</div>
          </div>
          <a
            href="#venue-program"
            className={`inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full px-5 text-sm font-bold text-white shadow-lg ${
              isTheatre ? 'bg-rose-600 hover:bg-rose-700' : 'bg-primary-600 hover:bg-primary-700'
            }`}
          >
            <Ticket className="h-4 w-4" />
            К афише
          </a>
        </div>
      </div>
    </div>
  );
}
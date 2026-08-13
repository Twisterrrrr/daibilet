import Link from 'next/link';

import type { PublicDestinationDto } from '@daibilet/contracts/public';
import { DaibiletLogo } from '@/components/DaibiletLogo';
import { catalogSocialStats } from '@/lib/catalog-social-stats';
import { formatNumber } from '@/lib/format';
import { cityHref } from '@/lib/routes';
import { landingCategoryHref } from '@/lib/landing-routes';
import { CANONICAL_LANDING_SLUGS } from '@/lib/landing-constants';
import { getFooterPopularDirections } from '@/lib/seo-internal-links';

const catalogLinks = [
  { label: 'Экскурсии', href: '/events?category=Экскурсии' },
  { label: 'Музеи и арт', href: '/events?category=Музеи+и+арт' },
  { label: 'Мероприятия', href: '/events?category=Мероприятия' },
  { label: 'Активный отдых', href: '/events?category=Активный+отдых' },
  { label: 'Развлечения', href: '/events?category=Развлечения' },
  { label: 'Речные прогулки', href: landingCategoryHref(CANONICAL_LANDING_SLUGS.river) },
  { label: 'Автобусные экскурсии', href: landingCategoryHref(CANONICAL_LANDING_SLUGS.bus) },
];

const companyLinks = [
  { label: 'О проекте', href: '/about' },
  { label: 'Блог', href: '/blog' },
  { label: 'Контакты', href: '/contacts' },
  { label: 'Помощь', href: '/help' },
  { label: 'Места', href: '/places' },
  { label: 'Площадки с афишей', href: '/venues' },
  { label: 'Локации', href: '/locations' },
  { label: 'Подборки', href: '/podborki' },
  { label: 'Реквизиты', href: '/requisites' },
  { label: 'Мои покупки', href: '/account/purchases' },
];

type SiteFooterProps = {
  destinations: PublicDestinationDto[];
  variant?: 'default' | 'compact';
};

function FooterLegalLinks() {
  return (
    <div className="flex flex-col gap-2 text-right sm:ml-auto">
      <div className="flex flex-wrap justify-end gap-x-5 gap-y-1.5">
        <Link href="/privacy#user-agreement" className="text-sm text-graphite-muted hover:text-graphite">
          Пользовательское соглашение
        </Link>
        <Link href="/privacy#privacy-policy" className="text-sm text-graphite-muted hover:text-graphite">
          Политика конфиденциальности
        </Link>
        <Link href="/offer" className="text-sm text-graphite-muted hover:text-graphite">
          Договор-оферта (для партнёров)
        </Link>
      </div>
      <div className="flex flex-wrap justify-end gap-x-5 gap-y-1.5">
        <Link href="/legal#refunds" className="text-sm text-graphite-muted hover:text-graphite">
          Правила возврата
        </Link>
        <Link href="/legal#rightsholders" className="text-sm text-graphite-muted hover:text-graphite">
          Правообладателям
        </Link>
      </div>
    </div>
  );
}

export function SiteFooter({ destinations, variant = 'default' }: SiteFooterProps) {
  if (variant === 'compact') {
    return (
      <footer className="border-t border-slate-200/80 bg-surface-muted" data-site-footer="compact">
        <div className="container-page py-6 sm:py-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <Link href="/" className="inline-flex" aria-label="Дайбилет">
                <DaibiletLogo textClassName="text-lg" />
              </Link>
              <div className="mt-3 text-sm font-medium text-graphite">
                <a href="mailto:info@daibilet.ru" className="transition-colors hover:text-primary-600">
                  info@daibilet.ru
                </a>
              </div>
            </div>
            <p className="text-sm text-graphite">&copy; {new Date().getFullYear()} Дайбилет</p>
          </div>
          <div className="mt-5 border-t border-slate-200/80 pt-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-end">
              <FooterLegalLinks />
            </div>
          </div>
        </div>
      </footer>
    );
  }

  const cities = destinations.filter((item) => item.type === 'city');
  const cityLinks = [...cities]
    .sort((a, b) => b.events - a.events)
    .slice(0, 8)
    .map((city) => ({
      label: city.name,
      href: cityHref(city),
    }));

  // Catalog social proof = public destinations with events (cities + regions).
  // Shared with home trust strip via catalogSocialStats (not /events.total / stats.events).
  const { events: eventsCount, venues: venuesCount, places: placesCount } =
    catalogSocialStats(destinations);
  const catalogStatsLine =
    eventsCount > 0 || venuesCount > 0 || placesCount > 0
      ? `${formatNumber(eventsCount)} событий · ${formatNumber(venuesCount)} площадок · ${formatNumber(placesCount)} городов`
      : null;

  const popularDirections = getFooterPopularDirections();

  return (
    <footer className="border-t border-slate-200/80 bg-surface-muted" data-site-footer="default">
      <div className="container-page py-14 sm:py-16">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-4 md:gap-12">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="inline-flex" aria-label="Дайбилет">
              <DaibiletLogo textClassName="text-lg" />
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-6 text-graphite-muted" data-nosnippet>
              Билеты на экскурсии, музеи и мероприятия по городам России.
              Покупайте онлайн, посещайте лучшее.
            </p>
            {catalogStatsLine ? (
              <p className="mt-3 max-w-xs text-sm text-graphite-muted" data-nosnippet>
                {catalogStatsLine}
              </p>
            ) : null}
            <div className="mt-5 text-sm font-medium text-graphite">
              <a href="mailto:info@daibilet.ru" className="transition-colors hover:text-primary-600">
                info@daibilet.ru
              </a>
            </div>
          </div>

          <FooterColumn title="События" links={catalogLinks} />
          <FooterColumn title="Города" links={cityLinks} />
          <FooterColumn title="Компания" links={companyLinks} />
        </div>

        <div className="mt-12 pt-10">
          <h3 className="text-sm font-semibold text-graphite">Популярные направления</h3>
          <div className="mt-5 grid gap-8 sm:grid-cols-2">
            {popularDirections.map((block) => (
              <div key={block.citySlug}>
                <p className="text-sm font-medium text-graphite">{block.cityName}</p>
                <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-2">
                  {block.links.map((link) => (
                    <li key={`${block.citySlug}:${link.href}`}>
                      <Link
                        href={link.href}
                        className="text-sm text-graphite-muted transition-colors hover:text-primary-600"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 border-t border-slate-200/80 pt-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <p className="text-sm text-graphite">&copy; {new Date().getFullYear()} Дайбилет</p>
            <FooterLegalLinks />
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: Array<{ label: string; href: string }>;
}) {
  if (!links.length) return null;

  return (
    <div>
      <h3 className="text-sm font-semibold text-graphite">{title}</h3>
      <ul className="mt-4 space-y-2.5">
        {links.map((link) => (
          <li key={`${title}:${link.label}`}>
            <Link
              href={link.href}
              className="text-sm text-graphite-muted transition-colors hover:text-primary-600"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

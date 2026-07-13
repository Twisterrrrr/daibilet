import Link from 'next/link';
import { Compass } from 'lucide-react';

import type { PublicDestinationDto } from '@daibilet/contracts/public';
import { cityHref } from '@/lib/routes';
import { landingCategoryHref } from '@/lib/landing-routes';
import { CANONICAL_LANDING_SLUGS } from '@/lib/landing-constants';

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
  { label: 'Блог', href: '/blog' },
  { label: 'Помощь', href: '/help' },
  { label: 'Площадки', href: '/venues' },
  { label: 'Локации', href: '/locations' },
  { label: 'Подборки', href: '/podborki' },
  { label: 'Мои покупки', href: '/account/purchases' },
];

type SiteFooterProps = {
  destinations: PublicDestinationDto[];
};

export function SiteFooter({ destinations }: SiteFooterProps) {
  const cityLinks = destinations
    .filter((item) => item.type === 'city')
    .sort((a, b) => b.events - a.events)
    .slice(0, 8)
    .map((city) => ({
      label: city.name,
      href: cityHref(city),
    }));

  return (
    <footer className="border-t border-slate-200 bg-slate-50">
      <div className="container-page py-12">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2">
              <Compass className="h-6 w-6 text-primary-600" />
              <span className="text-lg font-bold text-slate-900">
                Дай<span className="text-primary-600">билет</span>
              </span>
            </Link>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              Билеты на экскурсии, музеи и мероприятия по городам России.
              Покупайте онлайн, посещайте лучшее!
            </p>
            <div className="mt-4 text-base font-medium text-slate-800">
              <a href="mailto:info@daibilet.ru" className="transition-colors hover:text-primary-600">
                info@daibilet.ru
              </a>
            </div>
          </div>

          <FooterColumn title="События" links={catalogLinks} />
          <FooterColumn title="Города" links={cityLinks} />
          <FooterColumn title="Компания" links={companyLinks} />
        </div>

        <div className="mt-10 border-t border-slate-200 pt-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <p className="text-sm text-slate-900">&copy; {new Date().getFullYear()} Дайбилет</p>
            <div className="flex flex-col gap-2 text-right sm:ml-auto">
              <div className="flex flex-wrap justify-end gap-x-4 gap-y-1 sm:gap-x-6">
                <Link href="/privacy#user-agreement" className="text-sm text-slate-400 hover:text-slate-600">
                  Пользовательское соглашение
                </Link>
                <Link href="/privacy#privacy-policy" className="text-sm text-slate-400 hover:text-slate-600">
                  Политика конфиденциальности
                </Link>
                <Link href="/offer" className="text-sm text-slate-400 hover:text-slate-600">
                  Договор-оферта (для партнёров)
                </Link>
              </div>
              <div className="flex flex-wrap justify-end gap-x-4 gap-y-1 sm:gap-x-6">
                <Link href="/legal#refunds" className="text-sm text-slate-400 hover:text-slate-600">
                  Правила возврата
                </Link>
                <Link href="/legal#rightsholders" className="text-sm text-slate-400 hover:text-slate-600">
                  Правообладателям
                </Link>
              </div>
            </div>
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
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <ul className="mt-3 space-y-2">
        {links.map((link) => (
          <li key={`${title}:${link.label}`}>
            <Link
              href={link.href}
              className="text-sm text-slate-500 transition-colors hover:text-primary-600"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

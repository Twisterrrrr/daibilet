import { Compass } from 'lucide-react';

import { publicData } from '@/data';
import { cityHref } from '@/routes';

const catalogLinks = [
  { label: 'Экскурсии', href: '/events?category=Экскурсии' },
  { label: 'Музеи и арт', href: '/events?category=Музеи+и+арт' },
  { label: 'Мероприятия', href: '/events?category=Мероприятия' },
  { label: 'Активный отдых', href: '/events?category=Активный+отдых' },
  { label: 'Развлечения', href: '/events?category=Развлечения' },
  { label: 'Речные прогулки', href: '/landings/river-cruises' },
  { label: 'Вечеринки на теплоходе', href: '/landings/river-party' },
  { label: 'Автобусные экскурсии', href: '/landings/bus-tours' },
  { label: 'Салют 9 мая', href: '/landings/salute-9-may' },
];

const companyLinks = [
  { label: 'О сервисе', href: '/about' },
  { label: 'Подборки', href: '/podborki' },
  { label: 'Города', href: '/cities' },
  { label: 'Площадки', href: '/venues' },
  { label: 'Проверить заказ', href: '/my-orders' },
  { label: 'Помощь', href: '/help' },
];

export function Footer() {
  const cityLinks = publicData.destinations
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
            <a href="/" className="flex items-center gap-2">
              <Compass className="h-6 w-6 text-primary-600" />
              <span className="text-lg font-bold text-slate-900">
                Дай<span className="text-primary-600">билет</span>
              </span>
            </a>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              Билеты на экскурсии, музеи и мероприятия по городам России. Покупка проходит в виджетах билетных систем.
            </p>
            <div className="mt-4 space-y-1.5 text-base font-medium leading-none text-slate-800">
              <a href="mailto:hello@daibilet.ru" className="block transition-colors hover:text-primary-600">
                hello@daibilet.ru
              </a>
              <a href="https://daibilet.ru" className="block transition-colors hover:text-primary-600">
                daibilet.ru
              </a>
            </div>
          </div>

          <FooterColumn title="Каталог" links={catalogLinks} />
          <FooterColumn title="Города" links={cityLinks} />
          <FooterColumn title="Компания" links={companyLinks} />
        </div>

        <div className="mt-10 border-t border-slate-200 pt-6">
          <div className="flex flex-col gap-4 text-sm text-slate-400 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-slate-900">&copy; {new Date().getFullYear()} Дайбилет</p>
              <p className="mt-1">Агрегатор событий. Финансовый контур остается на стороне билетных систем.</p>
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-1 sm:justify-end">
              <a href="/privacy" className="hover:text-slate-600">Политика конфиденциальности</a>
              <a href="/legal" className="hover:text-slate-600">Правовая информация</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: Array<{ label: string; href: string }> }) {
  if (!links.length) return null;

  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <ul className="mt-3 space-y-2">
        {links.map((link) => (
          <li key={`${title}:${link.label}`}>
            <a href={link.href} className="text-sm text-slate-500 transition-colors hover:text-primary-600">
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

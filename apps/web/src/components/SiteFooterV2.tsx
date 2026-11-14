import Link from 'next/link';

import { fontUnbounded } from '@/lib/fonts';

const LINK_COLUMNS = [
  {
    title: 'Афиша',
    links: [
      { label: 'Афиша', href: '/events' },
      { label: 'Места', href: '/places' },
      { label: 'Подборки', href: '/podborki' },
    ],
  },
  {
    title: 'Полезное',
    links: [
      { label: 'Гид по городам', href: '/cities' },
      { label: 'Мой день', href: '/my-day' },
      { label: 'Блог', href: '/blog' },
    ],
  },
  {
    title: 'Помощь',
    links: [
      { label: 'Помощь и FAQ', href: '/help' },
      { label: 'Контакты', href: '/contacts' },
      { label: 'Мои покупки', href: '/account/purchases' },
    ],
  },
];

const LEGAL_LINKS = [
  { label: 'Пользовательское соглашение', href: '/privacy#user-agreement' },
  { label: 'Политика конфиденциальности', href: '/privacy#privacy-policy' },
  { label: 'Правила возврата', href: '/legal#refunds' },
];

/** Новый подвал шаблона (тёмный ink, Unbounded logo, красный акцент). Превью на /about2. */
export function SiteFooterV2() {
  return (
    <footer className="bg-ink text-white" data-site-footer="v2">
      <div className="container-page py-14 sm:py-16">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          <div className="col-span-2 sm:col-span-1">
            <Link
              href="/"
              className={`${fontUnbounded.className} text-xl font-extrabold text-white`}
              aria-label="Дайбилет"
            >
              дай<span className="text-accent">билет</span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-6 text-white/60" data-nosnippet>
              Афиша и гид по городам России. Помогаем выбрать и купить билеты без переплат.
            </p>
          </div>

          {LINK_COLUMNS.map((column) => (
            <div key={column.title}>
              <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-white/40">{column.title}</h3>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={`${column.title}:${link.href}`}>
                    <Link href={link.href} className="text-sm text-white/80 transition-colors hover:text-white">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-white/50">© {new Date().getFullYear()} Дайбилет. Все права защищены.</p>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {LEGAL_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-white/60 transition-colors hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
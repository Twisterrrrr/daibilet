import type { Metadata } from 'next';
import Link from 'next/link';
import { BookOpen, Bookmark, Map, Ticket } from 'lucide-react';

import { RecentViewsRail } from '@/components/RecentViewsRail.client';
import { SiteLayout } from '@/components/SiteLayout';
import { fontUnbounded } from '@/lib/fonts';
import { pageTitle } from '@/lib/seo-meta';

export const metadata: Metadata = {
  title: pageTitle('Страница не найдена - превью'),
  robots: { index: false, follow: false },
  alternates: { canonical: '/notfound' },
};

export default function NotFoundPreviewPage() {
  return (
    <SiteLayout chromeVariant="v2">
      <div className="container-page py-20 text-center sm:py-28">
        <p className={`${fontUnbounded.className} text-6xl font-extrabold text-accent sm:text-7xl`}>404</p>
        <h1 className={`${fontUnbounded.className} mt-4 text-2xl font-bold text-ink sm:text-3xl`}>
          Страница не найдена
        </h1>
        <p className="mx-auto mt-3 max-w-md text-ink-muted">
          Запрошенная страница не найдена. Перейдите в афишу событий или на главную.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/events"
            className="inline-flex items-center rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-white shadow-[0_6px_16px_rgba(255,71,87,0.25)] transition-colors hover:bg-accent-dark"
          >
            Смотреть афишу
          </Link>
          <Link
            href="/"
            className="inline-flex items-center rounded-xl bg-surface-alt px-6 py-3 text-sm font-semibold text-ink transition-colors hover:bg-[#eceef5]"
          >
            На главную
          </Link>
        </div>
      </div>

      <div className="container-page mb-16">
        <RecentViewsRail />
        <section className="mt-16">
          <h2 className="font-display text-lg font-bold tracking-tight text-ink">Куда дальше</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Афиша событий', href: '/events', Icon: Ticket },
              { label: 'Подборки', href: '/podborki', Icon: Bookmark },
              { label: 'Гид по городам', href: '/cities', Icon: Map },
              { label: 'Блог', href: '/blog', Icon: BookOpen },
            ].map(({ label, href, Icon }) => (
              <Link
                key={href}
                href={href}
                className="group flex items-center gap-3 rounded-2xl border border-line bg-white p-4 shadow-card transition hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-card-hover"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1 text-sm font-semibold text-ink group-hover:text-accent">{label}</span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </SiteLayout>
  );
}
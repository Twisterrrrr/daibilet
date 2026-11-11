import type { Metadata } from 'next';
import Link from 'next/link';

import { SiteLayout } from '@/components/SiteLayout';
import { fontUnbounded } from '@/lib/fonts';
import { pageTitle } from '@/lib/seo-meta';

export const metadata: Metadata = {
  title: pageTitle('Страница не найдена - превью'),
  robots: { index: false, follow: false },
  alternates: { canonical: '/404' },
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
    </SiteLayout>
  );
}
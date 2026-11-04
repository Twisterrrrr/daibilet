import type { Metadata } from 'next';
import Link from 'next/link';

import { SiteLayout } from '@/components/SiteLayout';
import { buildShareMetadata, pageTitle } from '@/lib/seo-meta';

const TITLE = 'Страница не найдена';
const DESCRIPTION = 'Запрошенная страница не найдена. Перейдите в афишу событий или на главную Дайбилет.';

export const metadata: Metadata = {
  title: pageTitle(TITLE),
  description: DESCRIPTION,
  robots: { index: false, follow: true },
  ...buildShareMetadata({
    title: `${TITLE} | Дайбилет`,
    description: DESCRIPTION,
    path: '/',
  }),
};

export default function NotFoundPage() {
  return (
    <SiteLayout>
      <div className="container-page py-16 text-center sm:py-24">
        <p className="text-sm font-medium uppercase tracking-wide text-slate-500">404</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900 sm:text-4xl">{TITLE}</h1>
        <p className="mx-auto mt-3 max-w-lg text-slate-600">{DESCRIPTION}</p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/events"
            className="inline-flex rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700"
          >
            Смотреть афишу
          </Link>
          <Link
            href="/"
            className="inline-flex rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 hover:border-slate-300"
          >
            На главную
          </Link>
        </div>
      </div>
    </SiteLayout>
  );
}

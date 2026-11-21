import type { Metadata } from 'next';
import Link from 'next/link';

import { PreviewCardsGrid } from '@/components/PreviewCardsGrid.client';
import { SiteLayout } from '@/components/SiteLayout';
import { PREVIEW_CARDS_MOCK } from '@/lib/preview-cards-mock';

export const metadata: Metadata = {
  title: 'Preview: сетка карточек',
  description: 'Изолированный smoke равных карточек каталога (featured/bento отключён).',
  robots: { index: false, follow: false },
};

export default function PreviewCardsPage() {
  return (
    <SiteLayout footerVariant="compact">
      <div className="container-page py-8 sm:py-10">
        <div className="mb-6 max-w-3xl space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-graphite-muted">
            Internal preview · noindex
          </p>
          <h1 className="font-display text-2xl font-bold tracking-tight text-graphite sm:text-3xl">
            Сетка карточек (flat)
          </h1>
          <p className="text-sm leading-relaxed text-graphite-muted sm:text-base">
            Мок из 10 экскурсий. Равные плитки без featured/bento. Preview: grid-cols-1 md:grid-cols-2
            lg:grid-cols-3.
          </p>
          <p className="text-sm text-graphite-muted">
            <Link href="/events" className="font-medium text-primary-700 underline-offset-2 hover:underline">
              К живому каталогу
            </Link>
            {' · '}
            не для SEO, не для покупки.
          </p>
        </div>
        <PreviewCardsGrid items={PREVIEW_CARDS_MOCK} />
      </div>
    </SiteLayout>
  );
}

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { EventPdpV2Preview } from '@/components/EventPdpV2Preview';
import { SiteLayout } from '@/components/SiteLayout';
import { loadEventDto } from '@/server/cached-event-data';
import '@/lib/env';
import '@/styles/v2-event-pdp.css';

export const metadata: Metadata = {
  title: 'Событие - превью нового дизайна',
  robots: { index: false, follow: false },
};

type Props = { params: Promise<{ slug: string }> };

export default async function Event2Page({ params }: Props) {
  const { slug } = await params;
  const loaded = await loadEventDto(slug);
  if (loaded.kind !== 'ok') notFound();
  return (
    <SiteLayout chromeVariant="v2">
      <EventPdpV2Preview page={loaded.payload} />
    </SiteLayout>
  );
}
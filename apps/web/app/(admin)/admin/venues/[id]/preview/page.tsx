import Link from 'next/link';
import { notFound } from 'next/navigation';

import { VenuePageView } from '@/components/VenuePageView.client';
import type { PublicVenueDto, PublicVenuePageDto } from '@daibilet/contracts/public';
import { venueTemplate } from '@/lib/venue-kind-mapping';
import { fetchVenueAdmissionProducts } from '@/server/finance-projection-client';
import { getCachedPublicVenueDto } from '@/server/cached-venue-data';
import { loadAdminPdpEditorData } from '@/server/admin-pdp-data';
import { loadAdminVenueDetail } from '@/server/admin-venues-data';

export const dynamic = 'force-dynamic';

type PageProps = { params: Promise<{ id: string }> };

export default async function AdminVenuePreviewPage({ params }: PageProps) {
  const { id: rawId } = await params;
  const id = decodeURIComponent(rawId);
  const detail = await loadAdminVenueDetail(id);
  if (!detail.found || !detail.slug) notFound();

  const [pdpData, publicPayload, admission] = await Promise.all([
    loadAdminPdpEditorData('venues', id),
    getCachedPublicVenueDto(detail.slug).catch(() => null),
    fetchVenueAdmissionProducts(detail.slug),
  ]);

  const venue: PublicVenueDto = {
    ...(publicPayload?.venue || {}),
    id: detail.id,
    slug: detail.slug,
    name: detail.title,
    title: detail.title,
    city: detail.city === '—' ? '' : detail.city,
    address: detail.address,
    latitude: detail.latitude,
    longitude: detail.longitude,
    metroStation: detail.metroStation,
    wayToFind: detail.wayToFind,
    phone: detail.phone,
    parkingInfo: detail.parkingInfo,
    type: detail.kind,
    placeType: detail.placeType,
    placeSubtype: detail.placeSubtype,
    pageStatus: detail.pageStatus,
    description: detail.description,
    shortDescription: detail.shortDescription,
    heroImageUrl: detail.heroImageUrl,
    seoH1: detail.seoH1,
    seoTitle: detail.seoTitle,
    seoDescription: detail.seoDescription,
    isIndexable: detail.isIndexable,
    events: publicPayload?.venue.events ?? detail.events.length,
    categories: publicPayload?.venue.categories || {},
  };

  const payload: PublicVenuePageDto = {
    ...(publicPayload || {}),
    venue,
    pdp: pdpData.document
      ? { variant: pdpData.document.variant, content: pdpData.document.content }
      : null,
    sessions: publicPayload?.sessions || [],
    relatedVenues: publicPayload?.relatedVenues || [],
    stopEvents: publicPayload?.stopEvents || [],
    nearbyEvents: publicPayload?.nearbyEvents || [],
    stats: publicPayload?.stats || { events: 0, categories: 0 },
  };
  const family = venueTemplate(detail.kind);

  return (
    <div className="min-h-screen bg-white">
      <div className="border-b border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-950">
        <div className="container-page flex flex-wrap items-center justify-between gap-2">
          <span>
            Предпросмотр сохранённого редакционного PDP: {detail.title}. Статус контента:{' '}
            {pdpData.document?.status || 'PDP ещё не создан'}. Публичная выдача продолжает использовать только READY.
          </span>
          <Link href={`/admin/venues/${encodeURIComponent(id)}`} className="font-semibold underline">
            Вернуться в редактор
          </Link>
        </div>
      </div>
      <VenuePageView
        key={detail.slug}
        slug={detail.slug}
        initialPayload={payload}
        admissionProducts={admission.items}
        pageTemplate={family}
      />
    </div>
  );
}

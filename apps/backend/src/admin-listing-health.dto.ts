import type { AdminListingHealthOverviewDto } from '@daibilet/contracts/admin';
import { prisma } from '@daibilet/db';
import { mapAdmissionProductDto } from './admission-products.dto.js';
import {
  resolveEventListingHealth,
  resolveVenueListingHealth,
} from './listing-health.js';

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 100;

export async function buildAdminListingHealthOverviewDto(
  searchParams: URLSearchParams = new URLSearchParams(),
): Promise<AdminListingHealthOverviewDto> {
  const limit = clampInt(searchParams.get('limit'), DEFAULT_LIMIT, 1, MAX_LIMIT);
  const entityType = cleanString(searchParams.get('entityType'))?.toUpperCase() || 'ALL';

  const [events, venues, admissions] = await Promise.all([
    entityType === 'ALL' || entityType === 'EVENT' ? loadEventHealthItems(limit) : Promise.resolve([]),
    entityType === 'ALL' || entityType === 'VENUE' ? loadVenueHealthItems(limit) : Promise.resolve([]),
    entityType === 'ALL' || entityType === 'ADMISSION_PRODUCT' ? loadAdmissionHealthItems(limit) : Promise.resolve([]),
  ]);

  const items = [...events, ...venues, ...admissions]
    .sort((a, b) => a.health.score - b.health.score)
    .slice(0, limit);
  const total = items.length;
  return {
    generatedAt: new Date().toISOString(),
    metrics: {
      total,
      ready: items.filter((item) => item.health.status === 'ready').length,
      review: items.filter((item) => item.health.status === 'review').length,
      blocked: items.filter((item) => item.health.status === 'blocked').length,
      averageScore: total ? Math.round(items.reduce((sum, item) => sum + item.health.score, 0) / total) : 0,
    },
    items,
  };
}

async function loadEventHealthItems(limit: number): Promise<AdminListingHealthOverviewDto['items']> {
  const rows = await prisma.event.findMany({
    orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
    take: limit,
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      imageUrl: true,
      status: true,
      kind: true,
      primaryCityId: true,
      venueId: true,
      categoryId: true,
      primarySubcategoryId: true,
      priceFromRub: true,
      purchaseFlow: true,
      offers: {
        where: { active: true },
        take: 5,
        select: { widgetUrl: true, deeplinkUrl: true },
      },
      sessions: {
        where: { isActive: true, cancelledAt: null },
        orderBy: [{ startsAt: 'asc' }, { id: 'asc' }],
        take: 5,
        select: { startsAt: true },
      },
      _count: { select: { offers: { where: { active: true } } } },
    },
  });

  return rows.map((row) => ({
    entityType: 'EVENT',
    entityId: row.id,
    title: row.title,
    slug: row.slug,
    health: resolveEventListingHealth({
      title: row.title,
      description: row.description,
      imageUrl: row.imageUrl,
      status: String(row.status),
      kind: String(row.kind),
      cityId: row.primaryCityId,
      venueId: row.venueId,
      categoryId: row.categoryId,
      primarySubcategoryId: row.primarySubcategoryId,
      priceFromRub: row.priceFromRub,
      purchaseFlow: String(row.purchaseFlow),
      offersCount: row._count.offers,
      hasPurchaseEntry: String(row.purchaseFlow) === 'PLATFORM' || row.offers.some((offer) => offer.widgetUrl || offer.deeplinkUrl),
      nextSessionAt: row.sessions.find((session) => session.startsAt && session.startsAt >= new Date())?.startsAt || null,
    }),
  }));
}

async function loadVenueHealthItems(limit: number): Promise<AdminListingHealthOverviewDto['items']> {
  const rows = await prisma.venue.findMany({
    orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
    take: limit,
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      shortDescription: true,
      heroImageUrl: true,
      pageStatus: true,
      cityId: true,
      address: true,
      _count: { select: { events: true, admissionProducts: true } },
    },
  });

  return rows.map((row) => ({
    entityType: 'VENUE',
    entityId: row.id,
    title: row.title,
    slug: row.slug,
    health: resolveVenueListingHealth({
      title: row.title,
      description: row.description,
      shortDescription: row.shortDescription,
      heroImageUrl: row.heroImageUrl,
      pageStatus: String(row.pageStatus),
      cityId: row.cityId,
      address: row.address,
      eventsCount: row._count.events,
      admissionProductsCount: row._count.admissionProducts,
    }),
  }));
}

async function loadAdmissionHealthItems(limit: number): Promise<AdminListingHealthOverviewDto['items']> {
  const rows = await prisma.admissionProduct.findMany({
    orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
    take: limit,
    select: {
      id: true,
      slug: true,
      title: true,
      shortTitle: true,
      description: true,
      shortDescription: true,
      type: true,
      status: true,
      purchaseFlow: true,
      managementMode: true,
      imageUrl: true,
      priceFromRub: true,
      ticketsVacant: true,
      validityMode: true,
      validFrom: true,
      validTo: true,
      validDaysAfterPurchase: true,
      salesStartsAt: true,
      salesEndsAt: true,
      cityId: true,
      venueId: true,
      supplierId: true,
      city: { select: { id: true, slug: true, title: true } },
      venue: { select: { id: true, slug: true, title: true, kind: true } },
      supplier: { select: { id: true, slug: true, title: true, status: true } },
      offers: {
        orderBy: [{ active: 'desc' }, { priceRub: 'asc' }, { id: 'asc' }],
        select: {
          id: true,
          title: true,
          priceRub: true,
          oldPriceRub: true,
          active: true,
          capacityTotal: true,
          groupSize: true,
        },
      },
    },
  });

  return rows.map((row) => {
    const dto = mapAdmissionProductDto(row);
    return {
      entityType: 'ADMISSION_PRODUCT',
      entityId: dto.id,
      title: dto.title,
      slug: dto.slug,
      health: dto.health,
    };
  });
}

function cleanString(value: string | null | undefined): string | null {
  const cleaned = String(value || '').trim();
  return cleaned ? cleaned : null;
}

function clampInt(value: string | null, fallback: number, min: number, max: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(parsed)));
}

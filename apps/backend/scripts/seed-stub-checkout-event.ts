import { prisma } from '@daibilet/db';
import { createStubCheckoutOrder } from '../src/checkout-stub.js';

const supplierId = 'sup_stub_daibilet';
const venueId = 'ven_stub_museum';
const eventId = 'evt_stub_museum_open_date';
const offerId = 'offer_stub_museum_adult';
const citySlug = 'moskva';
const eventSlug = 'stub-museum-open-date';

async function main() {
  const createOrder = process.argv.includes('--order');
  const validTo = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
  const city = await prisma.city.upsert({
    where: { slug: citySlug },
    update: {},
    create: {
      slug: citySlug,
      title: 'Moscow',
      isDestination: true,
    },
    select: { id: true, slug: true, title: true },
  });
  const supplier = await prisma.supplier.upsert({
    where: { slug: 'stub-daibilet-supplier' },
    update: {
      status: 'ACTIVE',
      defaultCatalogMode: 'INTERNAL_CHECKOUT',
      defaultCommissionBps: 1000,
      email: 'supplier-stub@daibilet.ru',
    },
    create: {
      id: supplierId,
      slug: 'stub-daibilet-supplier',
      title: 'Daibilet STUB supplier',
      legalName: 'Daibilet STUB supplier',
      status: 'ACTIVE',
      defaultCatalogMode: 'INTERNAL_CHECKOUT',
      paymentMode: 'SINGLE_MERCHANT',
      defaultCommissionBps: 1000,
      email: 'supplier-stub@daibilet.ru',
    },
    select: { id: true, slug: true, title: true },
  });
  const venue = await prisma.venue.upsert({
    where: { slug: 'stub-museum-daibilet' },
    update: {
      cityId: city.id,
      kind: 'MUSEUM_ART_SPACE',
      pageStatus: 'CANDIDATE',
    },
    create: {
      id: venueId,
      slug: 'stub-museum-daibilet',
      title: 'Daibilet STUB museum',
      shortDescription: 'Internal checkout smoke venue.',
      cityId: city.id,
      kind: 'MUSEUM_ART_SPACE',
      pageStatus: 'CANDIDATE',
    },
    select: { id: true, slug: true, title: true },
  });
  const event = await prisma.event.upsert({
    where: { slug: eventSlug },
    update: {
      title: 'STUB: museum open-date admission',
      kind: 'OPEN_DATE',
      status: 'READY',
      purchaseFlow: 'PLATFORM',
      managementMode: 'DAIBILET_MANAGED',
      sourceStatus: 'manual',
      primaryCityId: city.id,
      venueId: venue.id,
      supplierId: supplier.id,
      priceFromRub: 700,
      ticketsVacant: 100,
      scheduleLocked: false,
      openDateValidTo: validTo,
    },
    create: {
      id: eventId,
      slug: eventSlug,
      title: 'STUB: museum open-date admission',
      description: 'Internal checkout smoke event.',
      kind: 'OPEN_DATE',
      status: 'READY',
      purchaseFlow: 'PLATFORM',
      managementMode: 'DAIBILET_MANAGED',
      sourceStatus: 'manual',
      primaryCityId: city.id,
      venueId: venue.id,
      supplierId: supplier.id,
      createdByType: 'ADMIN',
      priceFromRub: 700,
      ticketsVacant: 100,
      scheduleLocked: false,
      openDateValidTo: validTo,
    },
    select: { id: true, slug: true, title: true },
  });
  const offer = await prisma.eventOffer.upsert({
    where: { id: offerId },
    update: {
      eventId: event.id,
      sourceCode: 'MANUAL',
      title: 'Adult admission',
      priceRub: 700,
      active: true,
    },
    create: {
      id: offerId,
      eventId: event.id,
      sourceCode: 'MANUAL',
      title: 'Adult admission',
      priceRub: 700,
      active: true,
    },
    select: { id: true, title: true, priceRub: true },
  });
  await prisma.supplierVenue.upsert({
    where: {
      supplierId_venueId: {
        supplierId: supplier.id,
        venueId: venue.id,
      },
    },
    update: {
      isPrimary: true,
      isActive: true,
    },
    create: {
      supplierId: supplier.id,
      venueId: venue.id,
      isPrimary: true,
      isActive: true,
    },
  });
  await prisma.supplierEvent.upsert({
    where: {
      supplierId_eventId: {
        supplierId: supplier.id,
        eventId: event.id,
      },
    },
    update: {
      catalogMode: 'INTERNAL_CHECKOUT',
      managementMode: 'DAIBILET_MANAGED',
      canEditContent: true,
      canEditMedia: true,
      canEditSeo: true,
      canEditSchedule: true,
      canEditOffers: true,
      isPrimary: true,
      isActive: true,
    },
    create: {
      supplierId: supplier.id,
      eventId: event.id,
      catalogMode: 'INTERNAL_CHECKOUT',
      managementMode: 'DAIBILET_MANAGED',
      canEditContent: true,
      canEditMedia: true,
      canEditSeo: true,
      canEditSchedule: true,
      canEditOffers: true,
      isPrimary: true,
      isActive: true,
    },
  });

  const output: Record<string, unknown> = {
    supplier,
    venue,
    city,
    event,
    offer,
    post: {
      url: '/api/checkout/stub',
      env: 'DAIBILET_STUB_CHECKOUT=1',
      body: {
        eventSlug: event.slug,
        offerId: offer.id,
        quantity: 1,
        buyer: {
          email: 'buyer-stub@daibilet.ru',
          name: 'Stub Buyer',
          phone: '+79990000000',
        },
      },
    },
  };

  if (createOrder) {
    process.env.DAIBILET_STUB_CHECKOUT = '1';
    output.order = await createStubCheckoutOrder({
      eventSlug: event.slug,
      offerId: offer.id,
      quantity: 1,
      buyer: {
        email: 'buyer-stub@daibilet.ru',
        name: 'Stub Buyer',
        phone: '+79990000000',
      },
      idempotencyKey: `stub-seed-${Date.now()}`,
    });
  }

  console.log(JSON.stringify(output, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

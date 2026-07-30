import { prisma } from '@daibilet/db';

const supplierSlug = 'test-museum';
const venueSlug = 'test-museum-venue';
const productSlug = 'test-museum-ticket';
const citySlug = 'moskva';
const adultOfferId = 'offer_test_museum_adult';
const concessionOfferId = 'offer_test_museum_concession';

async function main() {
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
    where: { slug: supplierSlug },
    update: {
      status: 'ACTIVE',
      integrationMode: 'INTERNAL_SALES',
      defaultCatalogMode: 'INTERNAL_CHECKOUT',
      defaultCommissionBps: 1000,
      email: 'test-museum@daibilet.ru',
    },
    create: {
      slug: supplierSlug,
      title: 'Test Museum Supplier',
      legalName: 'Test Museum Supplier',
      status: 'ACTIVE',
      integrationMode: 'INTERNAL_SALES',
      defaultCatalogMode: 'INTERNAL_CHECKOUT',
      paymentMode: 'SINGLE_MERCHANT',
      defaultCommissionBps: 1000,
      email: 'test-museum@daibilet.ru',
    },
    select: { id: true, slug: true, title: true },
  });

  const venue = await prisma.venue.upsert({
    where: { slug: venueSlug },
    update: {
      cityId: city.id,
      kind: 'MUSEUM_ART_SPACE',
      pageStatus: 'PUBLISHED',
    },
    create: {
      slug: venueSlug,
      title: 'Test Museum Gallery',
      shortDescription: 'Phase G admission smoke venue.',
      cityId: city.id,
      kind: 'MUSEUM_ART_SPACE',
      pageStatus: 'PUBLISHED',
    },
    select: { id: true, slug: true, title: true },
  });

  await prisma.supplierVenue.upsert({
    where: {
      supplierId_venueId: {
        supplierId: supplier.id,
        venueId: venue.id,
      },
    },
    update: { isPrimary: true, isActive: true },
    create: {
      supplierId: supplier.id,
      venueId: venue.id,
      isPrimary: true,
      isActive: true,
    },
  });

  const product = await prisma.admissionProduct.upsert({
    where: { slug: productSlug },
    update: {
      title: 'Test Museum Ticket',
      type: 'MUSEUM_ENTRY',
      status: 'PUBLISHED',
      purchaseFlow: 'PLATFORM',
      managementMode: 'DAIBILET_MANAGED',
      sourceCode: 'MANUAL',
      validityMode: 'OPEN_DATE',
      validTo,
      ticketsVacant: 100,
      priceFromRub: 250,
      venueId: venue.id,
      cityId: city.id,
      supplierId: supplier.id,
    },
    create: {
      slug: productSlug,
      title: 'Test Museum Ticket',
      shortTitle: 'Museum entry',
      type: 'MUSEUM_ENTRY',
      status: 'PUBLISHED',
      purchaseFlow: 'PLATFORM',
      managementMode: 'DAIBILET_MANAGED',
      sourceCode: 'MANUAL',
      sourceStatus: 'manual',
      validityMode: 'OPEN_DATE',
      validTo,
      ticketsVacant: 100,
      priceFromRub: 250,
      venueId: venue.id,
      cityId: city.id,
      supplierId: supplier.id,
      createdByType: 'ADMIN',
    },
    select: { id: true, slug: true, title: true, ticketsVacant: true },
  });

  const adultOffer = await prisma.admissionOffer.upsert({
    where: { id: adultOfferId },
    update: {
      admissionProductId: product.id,
      sourceCode: 'MANUAL',
      title: 'Adult',
      priceRub: 500,
      active: true,
    },
    create: {
      id: adultOfferId,
      admissionProductId: product.id,
      sourceCode: 'MANUAL',
      title: 'Adult',
      priceRub: 500,
      active: true,
    },
    select: { id: true, title: true, priceRub: true },
  });

  const concessionOffer = await prisma.admissionOffer.upsert({
    where: { id: concessionOfferId },
    update: {
      admissionProductId: product.id,
      sourceCode: 'MANUAL',
      title: 'Concession',
      priceRub: 250,
      active: true,
    },
    create: {
      id: concessionOfferId,
      admissionProductId: product.id,
      sourceCode: 'MANUAL',
      title: 'Concession',
      priceRub: 250,
      active: true,
    },
    select: { id: true, title: true, priceRub: true },
  });

  console.log(JSON.stringify({
    supplier,
    venue,
    city,
    product,
    offers: { adult: adultOffer, concession: concessionOffer },
    smoke: {
      adminAdmissionProducts: '/api/admin/admission-products',
      venueAdmissionProducts: `/api/admin/venues/${venue.id}/admission-products`,
      supplierAdmissions: `/api/supplier/admissions?supplier=${supplier.slug}`,
      listingHealth: '/api/admin/listing-health?entityType=ADMISSION_PRODUCT',
      stubCheckout: {
        url: '/api/checkout/stub',
        body: {
          subjectType: 'VENUE_ADMISSION',
          admissionProductSlug: product.slug,
          admissionOfferId: adultOffer.id,
          quantity: 1,
          buyer: {
            email: 'buyer-test@daibilet.ru',
            name: 'Test Buyer',
            phone: '+79991112233',
          },
        },
      },
    },
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { createHash } from 'node:crypto';
import { prisma } from '@daibilet/db';
import { createStubCheckoutOrder } from '../src/checkout-stub.js';

const citySlug = 'moskva';
const supplierId = 'sup_phase_g_test_museum';
const supplierSlug = 'phase-g-test-museum';
const ownerUserId = 'usr_phase_g_supplier_owner';
const venueId = 'ven_phase_g_test_museum';
const venueSlug = 'phase-g-test-museum';
const productId = 'adp_phase_g_test_museum_entry';
const productSlug = 'phase-g-test-museum-entry';
const adultOfferId = 'ado_phase_g_test_museum_adult';
const childOfferId = 'ado_phase_g_test_museum_child';

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

async function main() {
  const createOrder = process.argv.includes('--order');
  const resetCapacity = process.argv.includes('--reset-capacity');
  const validTo = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

  const city = await prisma.city.upsert({
    where: { slug: citySlug },
    update: { isDestination: true },
    create: {
      slug: citySlug,
      title: 'Москва',
      isDestination: true,
      introTitle: 'Куда сходить в Москве',
      introText: 'Тестовая городская точка для проверки входных билетов Дайбилет.',
    },
    select: { id: true, slug: true, title: true },
  });

  const owner = await prisma.siteUser.upsert({
    where: { email: 'supplier-test@daibilet.ru' },
    update: {
      name: 'Тестовый поставщик',
      phone: '+79990000001',
      isActive: true,
    },
    create: {
      id: ownerUserId,
      email: 'supplier-test@daibilet.ru',
      passwordHash: sha256('supplier123'),
      name: 'Тестовый поставщик',
      phone: '+79990000001',
      isActive: true,
      emailVerifiedAt: new Date(),
    },
    select: { id: true, email: true, name: true },
  });

  const supplier = await prisma.supplier.upsert({
    where: { slug: supplierSlug },
    update: {
      title: 'Тестовый музей Дайбилет',
      legalName: 'ООО "Тестовый музей Дайбилет"',
      status: 'ACTIVE',
      integrationMode: 'INTERNAL_SALES',
      defaultCatalogMode: 'INTERNAL_CHECKOUT',
      paymentMode: 'SINGLE_MERCHANT',
      defaultCommissionBps: 1200,
      yookassaShopId: 'test-shop-phase-g',
      email: 'supplier-test@daibilet.ru',
      phone: '+79990000001',
      websiteUrl: 'https://daibilet.ru',
      notes: 'Phase G smoke supplier for admission checkout.',
    },
    create: {
      id: supplierId,
      slug: supplierSlug,
      title: 'Тестовый музей Дайбилет',
      legalName: 'ООО "Тестовый музей Дайбилет"',
      kind: 'LEGAL_ENTITY',
      status: 'ACTIVE',
      inn: '7700000000',
      kpp: '770001001',
      ogrn: '1027700000000',
      email: 'supplier-test@daibilet.ru',
      phone: '+79990000001',
      websiteUrl: 'https://daibilet.ru',
      yookassaShopId: 'test-shop-phase-g',
      integrationMode: 'INTERNAL_SALES',
      defaultCatalogMode: 'INTERNAL_CHECKOUT',
      paymentMode: 'SINGLE_MERCHANT',
      defaultCommissionBps: 1200,
      notes: 'Phase G smoke supplier for admission checkout.',
    },
    select: { id: true, slug: true, title: true, status: true },
  });

  await prisma.supplierUser.upsert({
    where: {
      supplierId_siteUserId: {
        supplierId: supplier.id,
        siteUserId: owner.id,
      },
    },
    update: {
      role: 'OWNER',
      isActive: true,
      acceptedAt: new Date(),
    },
    create: {
      supplierId: supplier.id,
      siteUserId: owner.id,
      role: 'OWNER',
      isActive: true,
      invitedAt: new Date(),
      acceptedAt: new Date(),
    },
  });

  const legalProfile = await prisma.supplierLegalProfile.upsert({
    where: { supplierId: supplier.id },
    update: {
      status: 'VERIFIED',
      legalName: 'ООО "Тестовый музей Дайбилет"',
      legalAddress: '109012, Москва, тестовая улица, 1',
      inn: '7700000000',
      kpp: '770001001',
      ogrn: '1027700000000',
      signerFullName: 'Иванов Иван Иванович',
      signerPosition: 'Генеральный директор',
      financeEmail: 'supplier-test@daibilet.ru',
      docsEmail: 'supplier-test@daibilet.ru',
      verifiedAt: new Date(),
    },
    create: {
      supplierId: supplier.id,
      status: 'VERIFIED',
      legalName: 'ООО "Тестовый музей Дайбилет"',
      legalAddress: '109012, Москва, тестовая улица, 1',
      inn: '7700000000',
      kpp: '770001001',
      ogrn: '1027700000000',
      taxMode: 'USN_6',
      isVatPayer: false,
      signerFullName: 'Иванов Иван Иванович',
      signerPosition: 'Генеральный директор',
      financeEmail: 'supplier-test@daibilet.ru',
      docsEmail: 'supplier-test@daibilet.ru',
      verifiedAt: new Date(),
    },
    select: { id: true, status: true },
  });

  await prisma.supplierBankAccount.upsert({
    where: { id: 'bank_phase_g_test_museum_primary' },
    update: {
      supplierLegalProfileId: legalProfile.id,
      bankName: 'АО "Тест Банк"',
      bik: '044525225',
      accountNumber: '40702810000000000001',
      correspondentAccount: '30101810400000000225',
      isPrimary: true,
    },
    create: {
      id: 'bank_phase_g_test_museum_primary',
      supplierLegalProfileId: legalProfile.id,
      bankName: 'АО "Тест Банк"',
      bik: '044525225',
      accountNumber: '40702810000000000001',
      correspondentAccount: '30101810400000000225',
      isPrimary: true,
    },
  });

  const venue = await prisma.venue.upsert({
    where: { slug: venueSlug },
    update: {
      title: 'Тестовый музей Дайбилет',
      cityId: city.id,
      kind: 'MUSEUM_ART_SPACE',
      pageStatus: 'PUBLISHED',
      address: 'Москва, тестовая улица, 1',
      shortDescription: 'Проверочная площадка для входных билетов и внутреннего checkout.',
      description:
        'Тестовая музейная площадка Дайбилет используется для проверки карточки площадки, входных билетов, ЛК поставщика, заказов и будущего подключения YooKassa. Карточка не предназначена для публикации в реальном каталоге без отдельного решения администратора.',
    },
    create: {
      id: venueId,
      slug: venueSlug,
      title: 'Тестовый музей Дайбилет',
      cityId: city.id,
      kind: 'MUSEUM_ART_SPACE',
      pageStatus: 'PUBLISHED',
      address: 'Москва, тестовая улица, 1',
      shortDescription: 'Проверочная площадка для входных билетов и внутреннего checkout.',
      description:
        'Тестовая музейная площадка Дайбилет используется для проверки карточки площадки, входных билетов, ЛК поставщика, заказов и будущего подключения YooKassa. Карточка не предназначена для публикации в реальном каталоге без отдельного решения администратора.',
    },
    select: { id: true, slug: true, title: true, kind: true },
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

  const product = await prisma.admissionProduct.upsert({
    where: { slug: productSlug },
    update: {
      title: 'Входной билет в тестовый музей',
      shortTitle: 'Входной билет',
      description:
        'Open-date билет для проверки внутреннего checkout Дайбилет. Покупатель выбирает категорию билета, получает подтверждение покупки и может увидеть заказ в витрине покупателя. Для реальных продаж карточку нужно заменить на данные подключенного музея.',
      shortDescription: 'Open-date входной билет для проверки STUB checkout.',
      type: 'MUSEUM_ENTRY',
      status: 'PUBLISHED',
      purchaseFlow: 'PLATFORM',
      managementMode: 'DAIBILET_MANAGED',
      sourceCode: 'MANUAL',
      sourceStatus: 'manual',
      seoH1: 'Входной билет в тестовый музей',
      seoTitle: 'Входной билет в тестовый музей - Дайбилет',
      seoDescription: 'Тестовый open-date билет для проверки внутреннего checkout Дайбилет.',
      canonicalPath: `/venues/${venue.slug}`,
      isIndexable: false,
      priceFromRub: 350,
      defaultCapacityTotal: 100,
      ...(resetCapacity ? { ticketsVacant: 100 } : {}),
      validityMode: 'OPEN_DATE',
      validTo,
      cityId: city.id,
      venueId: venue.id,
      supplierId: supplier.id,
      createdByType: 'ADMIN',
      moderatedAt: new Date(),
      moderationComment: 'Phase G smoke admission product.',
    },
    create: {
      id: productId,
      slug: productSlug,
      title: 'Входной билет в тестовый музей',
      shortTitle: 'Входной билет',
      description:
        'Open-date билет для проверки внутреннего checkout Дайбилет. Покупатель выбирает категорию билета, получает подтверждение покупки и может увидеть заказ в витрине покупателя. Для реальных продаж карточку нужно заменить на данные подключенного музея.',
      shortDescription: 'Open-date входной билет для проверки STUB checkout.',
      type: 'MUSEUM_ENTRY',
      status: 'PUBLISHED',
      purchaseFlow: 'PLATFORM',
      managementMode: 'DAIBILET_MANAGED',
      sourceCode: 'MANUAL',
      sourceStatus: 'manual',
      seoH1: 'Входной билет в тестовый музей',
      seoTitle: 'Входной билет в тестовый музей - Дайбилет',
      seoDescription: 'Тестовый open-date билет для проверки внутреннего checkout Дайбилет.',
      canonicalPath: `/venues/${venue.slug}`,
      isIndexable: false,
      priceFromRub: 350,
      ticketsVacant: 100,
      defaultCapacityTotal: 100,
      validityMode: 'OPEN_DATE',
      validTo,
      cityId: city.id,
      venueId: venue.id,
      supplierId: supplier.id,
      createdByType: 'ADMIN',
      moderatedAt: new Date(),
      moderationComment: 'Phase G smoke admission product.',
    },
    select: { id: true, slug: true, title: true, priceFromRub: true, ticketsVacant: true },
  });

  const adultOffer = await prisma.admissionOffer.upsert({
    where: { id: adultOfferId },
    update: {
      admissionProductId: product.id,
      sourceCode: 'MANUAL',
      title: 'Взрослый',
      priceRub: 700,
      capacityTotal: 100,
      active: true,
    },
    create: {
      id: adultOfferId,
      admissionProductId: product.id,
      sourceCode: 'MANUAL',
      title: 'Взрослый',
      priceRub: 700,
      capacityTotal: 100,
      active: true,
    },
    select: { id: true, title: true, priceRub: true },
  });

  const childOffer = await prisma.admissionOffer.upsert({
    where: { id: childOfferId },
    update: {
      admissionProductId: product.id,
      sourceCode: 'MANUAL',
      title: 'Льготный',
      priceRub: 350,
      capacityTotal: 100,
      active: true,
    },
    create: {
      id: childOfferId,
      admissionProductId: product.id,
      sourceCode: 'MANUAL',
      title: 'Льготный',
      priceRub: 350,
      capacityTotal: 100,
      active: true,
    },
    select: { id: true, title: true, priceRub: true },
  });

  const output: Record<string, unknown> = {
    supplier,
    owner,
    city,
    venue,
    admissionProduct: product,
    admissionOffers: [adultOffer, childOffer],
    checks: {
      adminAdmissionProducts: `/api/admin/admission-products?q=${product.slug}`,
      venueAdmissions: `/api/admin/venues/${venue.id}/admission-products`,
      supplierAdmissions: `/api/supplier/admissions?supplier=${supplier.slug}`,
      listingHealth: '/api/admin/listing-health?entityType=ADMISSION_PRODUCT',
    },
    post: {
      url: '/api/checkout/stub',
      env: 'DAIBILET_STUB_CHECKOUT=1',
      body: {
        subjectType: 'VENUE_ADMISSION',
        admissionProductSlug: product.slug,
        admissionOfferId: adultOffer.id,
        quantity: 1,
        buyer: {
          email: 'buyer-admission-stub@daibilet.ru',
          name: 'Admission Stub Buyer',
          phone: '+79990000002',
        },
        idempotencyKey: 'phase-g-admission-smoke-001',
      },
    },
  };

  if (createOrder) {
    process.env.DAIBILET_STUB_CHECKOUT = '1';
    output.order = await createStubCheckoutOrder({
      subjectType: 'VENUE_ADMISSION',
      admissionProductSlug: product.slug,
      admissionOfferId: adultOffer.id,
      quantity: 1,
      buyer: {
        email: 'buyer-admission-stub@daibilet.ru',
        name: 'Admission Stub Buyer',
        phone: '+79990000002',
      },
      idempotencyKey: 'phase-g-admission-smoke-001',
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

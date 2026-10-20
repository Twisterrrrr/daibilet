import { prisma } from '@daibilet/db';
import { buildAdminSupplierDetailDto } from './admin-suppliers.dto.js';

export async function linkAdminSupplierVenue(supplierIdOrSlug: string, venueId: string) {
  const [supplier, venue] = await Promise.all([
    prisma.supplier.findFirst({
      where: { OR: [{ id: supplierIdOrSlug }, { slug: supplierIdOrSlug }], status: { not: 'ARCHIVED' } },
      select: { id: true },
    }),
    prisma.venue.findUnique({ where: { id: venueId }, select: { id: true } }),
  ]);
  if (!supplier) throw Object.assign(new Error('supplier_not_found'), { statusCode: 404 });
  if (!venue) throw Object.assign(new Error('venue_not_found'), { statusCode: 404 });

  await prisma.supplierVenue.upsert({
    where: { supplierId_venueId: { supplierId: supplier.id, venueId: venue.id } },
    create: { supplierId: supplier.id, venueId: venue.id, isActive: true, isPrimary: false },
    update: { isActive: true },
  });
  return buildAdminSupplierDetailDto(supplier.id);
}

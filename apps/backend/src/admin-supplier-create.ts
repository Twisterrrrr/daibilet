import { prisma } from '@daibilet/db';
import { buildAdminSupplierDetailDto } from './admin-suppliers.dto.js';

export interface CreateAdminSupplierInput {
  title: string;
  slug: string;
  integrationMode: 'INTERNAL_SALES' | 'IMPORTED_TICKETING_SYSTEM' | 'API_SYNC';
}

export async function createAdminSupplier(input: CreateAdminSupplierInput) {
  const slug = input.slug.toLowerCase();
  const existing = await prisma.supplier.findUnique({ where: { slug }, select: { id: true } });
  if (existing) throw Object.assign(new Error('supplier_slug_exists'), { statusCode: 409 });

  const defaultCatalogMode = input.integrationMode === 'INTERNAL_SALES' ? 'INTERNAL_CHECKOUT' : 'WIDGET_ONLY';
  let supplier: { id: string };
  try {
    supplier = await prisma.supplier.create({
      data: {
        title: input.title,
        slug,
        status: 'DRAFT',
        integrationMode: input.integrationMode,
        defaultCatalogMode,
        defaultCommissionBps: 0,
      },
      select: { id: true },
    });
  } catch (error) {
    if ((error as { code?: string }).code === 'P2002') {
      throw Object.assign(new Error('supplier_slug_exists'), { statusCode: 409 });
    }
    throw error;
  }
  return buildAdminSupplierDetailDto(supplier.id);
}

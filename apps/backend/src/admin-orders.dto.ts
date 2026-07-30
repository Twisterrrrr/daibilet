import { buildAdminPurchasesListDto } from './purchase-projection.js';

export async function buildAdminOrdersListDto(searchParams: URLSearchParams = new URLSearchParams()) {
  return buildAdminPurchasesListDto(searchParams);
}

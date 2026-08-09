import { buildAdminPurchaseDetailDto, buildAdminPurchasesListDto } from './purchase-projection.js';

export async function buildAdminOrdersListDto(searchParams: URLSearchParams = new URLSearchParams()) {
  return buildAdminPurchasesListDto(searchParams);
}

export async function buildAdminOrderDetailDto(orderKey: string) {
  return buildAdminPurchaseDetailDto(orderKey);
}

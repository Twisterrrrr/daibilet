import { buildAdminPurchaseDetailDto, buildAdminPurchasesListDto, createAdminPurchaseRefundRequest, type AdminCreateRefundRequestInput } from './purchase-projection.js';

export async function buildAdminOrdersListDto(searchParams: URLSearchParams = new URLSearchParams()) {
  return buildAdminPurchasesListDto(searchParams);
}

export async function buildAdminOrderDetailDto(orderKey: string) {
  return buildAdminPurchaseDetailDto(orderKey);
}

export async function createAdminOrderRefundRequestDto(orderKey: string, input: AdminCreateRefundRequestInput) {
  return createAdminPurchaseRefundRequest(orderKey, input);
}

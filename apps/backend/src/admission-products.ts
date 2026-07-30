import type {
  AdmissionProductReadinessCode,
  AdmissionProductReadinessDto,
  AdmissionProductType,
  AdmissionValidityMode,
} from '@daibilet/contracts/admission';
import type { ReadinessIssue } from '@daibilet/contracts/common';

const MIN_PRICE_RUB = 100;

const VENUE_KIND_DEFAULT_ADMISSION_TYPE: Record<string, AdmissionProductType> = {
  MUSEUM_ART_SPACE: 'MUSEUM_ENTRY',
  ATTRACTION: 'ATTRACTION_ENTRY',
  OUTDOOR_LOCATION: 'PARK_ENTRY',
};

export interface AdmissionOfferReadinessInput {
  active?: boolean | null;
  priceRub?: number | null;
}

export interface AdmissionProductReadinessInput {
  now: Date;
  venueId?: string | null;
  venueKind?: string | null;
  supplierId?: string | null;
  supplierStatus?: string | null;
  status?: string | null;
  purchaseFlow?: string | null;
  managementMode?: string | null;
  validityMode?: AdmissionValidityMode | string | null;
  validFrom?: Date | string | null;
  validTo?: Date | string | null;
  validDaysAfterPurchase?: number | null;
  salesStartsAt?: Date | string | null;
  salesEndsAt?: Date | string | null;
  ticketsVacant?: number | null;
  offers?: AdmissionOfferReadinessInput[] | null;
}

export function inferAdmissionProductTypeFromVenueKind(venueKind?: string | null): AdmissionProductType {
  return VENUE_KIND_DEFAULT_ADMISSION_TYPE[String(venueKind || '').toUpperCase()] || 'OTHER';
}

export function resolveAdmissionProductReadiness(
  input: AdmissionProductReadinessInput,
): AdmissionProductReadinessDto {
  const blockers: AdmissionProductReadinessDto['blockers'] = [];
  const warnings: AdmissionProductReadinessDto['warnings'] = [];
  const now = input.now;

  if (!input.venueId) blockers.push(issue('MISSING_VENUE', 'Площадка не привязана', 'high'));
  if (!input.supplierId) {
    blockers.push(issue('MISSING_SUPPLIER', 'Поставщик не привязан', 'high'));
  } else if (String(input.supplierStatus || '') !== 'ACTIVE') {
    blockers.push(issue('SUPPLIER_NOT_ACTIVE', 'Поставщик не активен', 'high'));
  }
  if (String(input.purchaseFlow || '') !== 'PLATFORM') {
    blockers.push(issue('NOT_PLATFORM_CHECKOUT', 'Входной билет не подключен к checkout Daibilet', 'high'));
  }
  if (String(input.managementMode || '') !== 'DAIBILET_MANAGED') {
    warnings.push(issue('NOT_DAIBILET_MANAGED', 'Карточка не ведется Daibilet вручную', 'medium'));
  }

  if (dateAfter(input.salesStartsAt, now)) {
    blockers.push(issue('SALES_NOT_STARTED', 'Продажи еще не начались', 'high'));
  }
  if (dateBefore(input.salesEndsAt, now)) {
    blockers.push(issue('SALES_CLOSED', 'Продажи закрыты', 'high'));
  }
  if (dateAfter(input.validFrom, now)) {
    blockers.push(issue('VALIDITY_NOT_STARTED', 'Билет еще не действует', 'high'));
  }
  if (dateBefore(input.validTo, now)) {
    blockers.push(issue('VALIDITY_EXPIRED', 'Срок действия билета истек', 'high'));
  }
  if (String(input.validityMode || '') === 'VALID_DAYS_AFTER_PURCHASE' && !positiveInteger(input.validDaysAfterPurchase)) {
    blockers.push(issue('MISSING_VALID_DAYS', 'Не задан срок действия после покупки', 'high'));
  }
  if (input.ticketsVacant != null && input.ticketsVacant <= 0) {
    blockers.push(issue('NO_TICKETS_LEFT', 'Нет доступных билетов', 'high'));
  }

  const activeOffers = (input.offers || []).filter((offer) => offer.active !== false);
  if (!activeOffers.length) {
    blockers.push(issue('MISSING_OFFER', 'Нет активных категорий билетов', 'high'));
  } else if (!activeOffers.some((offer) => offer.priceRub != null)) {
    blockers.push(issue('MISSING_PRICE', 'Не задана цена билета', 'high'));
  } else if (!activeOffers.some((offer) => Number(offer.priceRub) >= MIN_PRICE_RUB)) {
    blockers.push(issue('PRICE_TOO_LOW', 'Все цены ниже 100 рублей', 'high'));
  }

  return {
    canSell: blockers.length === 0,
    blockers,
    warnings,
  };
}

function issue(
  code: AdmissionProductReadinessCode,
  label: string,
  severity: ReadinessIssue['severity'],
): ReadinessIssue & { code: AdmissionProductReadinessCode } {
  return { code, label, severity };
}

function positiveInteger(value: number | null | undefined): boolean {
  return Number.isInteger(value) && Number(value) > 0;
}

function dateAfter(value: Date | string | null | undefined, threshold: Date): boolean {
  const date = parseDate(value);
  return Boolean(date && date > threshold);
}

function dateBefore(value: Date | string | null | undefined, threshold: Date): boolean {
  const date = parseDate(value);
  return Boolean(date && date < threshold);
}

function parseDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

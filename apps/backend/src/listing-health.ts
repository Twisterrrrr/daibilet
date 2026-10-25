import type {
  ListingHealthDto,
  ListingHealthEntityType,
  ListingHealthIssueCode,
  ListingHealthIssueDto,
  ListingHealthIssueSeverity,
} from '@daibilet/contracts/listing-health';
import type { AdmissionProductReadinessDto } from '@daibilet/contracts/admission';

const DESCRIPTION_MIN_LENGTH = 200;
const MIN_PRICE_RUB = 100;

const PENALTY: Record<ListingHealthIssueSeverity, number> = {
  high: 35,
  medium: 15,
  low: 5,
};

export interface EventListingHealthInput {
  now?: Date;
  title?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  status?: string | null;
  kind?: string | null;
  cityId?: string | null;
  venueId?: string | null;
  categoryId?: string | null;
  primarySubcategoryId?: string | null;
  priceFromRub?: number | null;
  purchaseFlow?: string | null;
  offersCount?: number | null;
  hasPurchaseEntry?: boolean | null;
  nextSessionAt?: Date | string | null;
}

export interface VenueListingHealthInput {
  title?: string | null;
  description?: string | null;
  shortDescription?: string | null;
  heroImageUrl?: string | null;
  pageStatus?: string | null;
  cityId?: string | null;
  address?: string | null;
  eventsCount?: number | null;
  admissionProductsCount?: number | null;
}

export interface AdmissionListingHealthInput {
  title?: string | null;
  description?: string | null;
  shortDescription?: string | null;
  imageUrl?: string | null;
  status?: string | null;
  priceFromRub?: number | null;
  readiness: AdmissionProductReadinessDto;
}

export function resolveEventListingHealth(input: EventListingHealthInput): ListingHealthDto {
  const issues: ListingHealthIssueDto[] = [];
  addIssue(issues, !cleanString(input.title), 'MISSING_TITLE', 'Нет названия', 'high');
  addIssue(issues, !cleanString(input.imageUrl), 'MISSING_IMAGE', 'Нет изображения', 'medium');
  addIssue(
    issues,
    textLength(input.description) > 0 && textLength(input.description) < DESCRIPTION_MIN_LENGTH,
    'WEAK_DESCRIPTION',
    'Описание короче 200 символов',
    'low',
  );
  addIssue(issues, !input.cityId, 'MISSING_CITY', 'Не указан город', 'medium');
  addIssue(issues, !input.venueId, 'MISSING_VENUE', 'Не указана площадка', 'medium');
  addIssue(issues, !input.categoryId, 'MISSING_CATEGORY', 'Не указана категория', 'high');
  addIssue(issues, !input.primarySubcategoryId, 'MISSING_SUBCATEGORY', 'Не указана основная подкатегория', 'medium');
  addIssue(issues, !['READY', 'PUBLISHED'].includes(String(input.status || '')), 'NOT_PUBLISHED', 'Карточка не готова к публикации', 'medium');
  addIssue(issues, Number(input.offersCount || 0) < 1, 'MISSING_OFFER', 'Нет категорий билетов', 'high');
  addIssue(issues, input.priceFromRub == null, 'MISSING_PRICE', 'Нет цены', 'high');
  addIssue(
    issues,
    input.priceFromRub != null && input.priceFromRub > 0 && input.priceFromRub < MIN_PRICE_RUB,
    'PRICE_TOO_LOW',
    'Цена ниже 100 рублей',
    'medium',
  );
  addIssue(issues, !input.hasPurchaseEntry, 'MISSING_PURCHASE_ENTRY', 'Не настроена покупка', 'high');
  addIssue(
    issues,
    String(input.kind || '') !== 'OPEN_DATE' && !isFutureDate(input.nextSessionAt, input.now),
    'NO_FUTURE_SESSIONS',
    'Нет ближайших сеансов',
    'high',
  );

  return buildListingHealth('EVENT', issues);
}

export function resolveVenueListingHealth(input: VenueListingHealthInput): ListingHealthDto {
  const issues: ListingHealthIssueDto[] = [];
  addIssue(issues, !cleanString(input.title), 'MISSING_TITLE', 'Нет названия', 'high');
  addIssue(issues, !input.cityId, 'MISSING_CITY', 'Не указан город', 'medium');
  addIssue(issues, !cleanString(input.address), 'MISSING_ADDRESS', 'Не указан адрес', 'low');
  addIssue(issues, !cleanString(input.heroImageUrl), 'MISSING_IMAGE', 'Нет hero-изображения', 'medium');
  addIssue(
    issues,
    textLength(input.description || input.shortDescription) > 0 &&
      textLength(input.description || input.shortDescription) < DESCRIPTION_MIN_LENGTH,
    'WEAK_DESCRIPTION',
    'Описание площадки короче 200 символов',
    'low',
  );
  addIssue(
    issues,
    Number(input.eventsCount || 0) < 1 && Number(input.admissionProductsCount || 0) < 1,
    'NO_EVENTS',
    'Нет событий или входных билетов',
    'medium',
  );

  return buildListingHealth('VENUE', issues);
}

export function resolveAdmissionProductListingHealth(input: AdmissionListingHealthInput): ListingHealthDto {
  const issues: ListingHealthIssueDto[] = [];
  addIssue(issues, !cleanString(input.title), 'MISSING_TITLE', 'Нет названия', 'high');
  addIssue(issues, !cleanString(input.imageUrl), 'MISSING_IMAGE', 'Нет изображения', 'medium');
  addIssue(
    issues,
    textLength(input.description || input.shortDescription) > 0 &&
      textLength(input.description || input.shortDescription) < DESCRIPTION_MIN_LENGTH,
    'WEAK_DESCRIPTION',
    'Описание входного билета короче 200 символов',
    'low',
  );
  addIssue(issues, !['READY', 'PUBLISHED'].includes(String(input.status || '')), 'NOT_PUBLISHED', 'Карточка не готова к публикации', 'medium');

  for (const readinessIssue of [...input.readiness.blockers, ...input.readiness.warnings]) {
    addIssue(
      issues,
      true,
      readinessIssue.code as ListingHealthIssueCode,
      readinessIssue.label,
      readinessIssue.severity === 'high' ? 'high' : readinessIssue.severity === 'low' ? 'low' : 'medium',
    );
  }

  return buildListingHealth('ADMISSION_PRODUCT', dedupeIssues(issues));
}

export function buildListingHealth(
  entityType: ListingHealthEntityType,
  issues: ListingHealthIssueDto[],
  generatedAt = new Date(),
): ListingHealthDto {
  const score = Math.max(0, 100 - issues.reduce((sum, issue) => sum + issue.penalty, 0));
  const blockers = issues.filter((issue) => issue.severity === 'high');
  const warnings = issues.filter((issue) => issue.severity !== 'high');
  const status = blockers.length ? 'blocked' : warnings.length || score < 90 ? 'review' : 'ready';
  return {
    entityType,
    status,
    score,
    canPublish: blockers.length === 0,
    canSell: blockers.length === 0,
    blockers,
    warnings,
    generatedAt: generatedAt.toISOString(),
  };
}

function addIssue(
  target: ListingHealthIssueDto[],
  condition: boolean,
  code: ListingHealthIssueCode,
  label: string,
  severity: ListingHealthIssueSeverity,
): void {
  if (!condition) return;
  target.push({ code, label, severity, penalty: PENALTY[severity] });
}

function dedupeIssues(issues: ListingHealthIssueDto[]): ListingHealthIssueDto[] {
  const seen = new Set<string>();
  const result: ListingHealthIssueDto[] = [];
  for (const issue of issues) {
    if (seen.has(issue.code)) continue;
    seen.add(issue.code);
    result.push(issue);
  }
  return result;
}

function cleanString(value: string | null | undefined): string | null {
  const cleaned = String(value || '').trim();
  return cleaned ? cleaned : null;
}

function textLength(value: string | null | undefined): number {
  return cleanString(value)?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().length || 0;
}

function isFutureDate(value: Date | string | null | undefined, now = new Date()): boolean {
  if (!value) return false;
  const date = value instanceof Date ? value : new Date(value);
  return !Number.isNaN(date.getTime()) && date >= now;
}

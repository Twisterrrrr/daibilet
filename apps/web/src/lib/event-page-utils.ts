import type { PublicEventPageDto } from '@daibilet/contracts/public';

import { formatNumber } from '@/lib/format';

const MIN_DISPLAY_PRICE_RUB = 100;

export const FLEXIBLE_SCHEDULE_LABEL = 'Билеты с открытой датой';

export function isFlexibleScheduleSession(session: {
  startsAt?: string | null;
  dateLabel?: string | null;
  timeLabel?: string | null;
  sourceStatus?: string | null;
  kind?: string | null;
}): boolean {
  const kind = String(session.kind || '').toUpperCase();
  if (kind === 'OPEN_DATE') return true;
  if (!session.startsAt) return true;
  const sourceStatus = String(session.sourceStatus || '').toLowerCase();
  if (sourceStatus === 'widget' || sourceStatus === 'open_date') return true;
  const label = `${session.dateLabel || ''} ${session.timeLabel || ''}`.toLowerCase();
  return label.includes('виджет') || label.includes('выберите время') || label.includes('при покупке');
}

export function formatVacantSeats(count: number): string {
  const mod10 = Math.abs(count) % 10;
  const mod100 = Math.abs(count) % 100;
  let word = 'мест';
  if (mod100 < 11 || mod100 > 19) {
    if (mod10 === 1) word = 'место';
    else if (mod10 >= 2 && mod10 <= 4) word = 'места';
  }
  return `${count} ${word}`;
}

export function formatAgeLimit(value?: string | null): string | null {
  const text = String(value || '').trim();
  if (!text) return null;
  if (/^\d+$/.test(text)) return `${text}+`;
  return text;
}

export function formatPriceRub(value?: number | null): string | null {
  if (!value || value <= 0) return null;
  return `${formatNumber(Math.round(value))} ₽`;
}

export function getTicketPriceRange(payload: PublicEventPageDto): { min: number; max: number } | null {
  const values: number[] = [];

  if (Array.isArray(payload.ticketPrices) && payload.ticketPrices.length) {
    for (const item of payload.ticketPrices) {
      if (item.priceRub >= MIN_DISPLAY_PRICE_RUB) values.push(item.priceRub);
    }
  } else {
    for (const offer of payload.offers ?? []) {
      if (offer.active !== false && typeof offer.priceRub === 'number' && offer.priceRub >= MIN_DISPLAY_PRICE_RUB) {
        values.push(offer.priceRub);
      }
    }
    if (typeof payload.stats.priceFrom === 'number' && payload.stats.priceFrom >= MIN_DISPLAY_PRICE_RUB) {
      values.push(payload.stats.priceFrom);
    }
    if (typeof payload.event.priceFrom === 'number' && payload.event.priceFrom >= MIN_DISPLAY_PRICE_RUB) {
      values.push(payload.event.priceFrom);
    }
  }

  for (const session of payload.sessions ?? []) {
    if (typeof session.priceFrom === 'number' && session.priceFrom >= MIN_DISPLAY_PRICE_RUB) {
      values.push(session.priceFrom);
    }
  }

  if (!values.length) return null;
  return { min: Math.min(...values), max: Math.max(...values) };
}

export function formatBuyCardPrice(range: { min: number; max: number }): string {
  if (range.min === range.max) return `от ${formatNumber(Math.round(range.min))} ₽`;
  return `${formatNumber(Math.round(range.min))} – ${formatNumber(Math.round(range.max))} ₽`;
}

export function cleanDisplayText(value?: string | null): string {
  return String(value || '')
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/\s*(p|div|li|h[1-6])\s*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function sanitizeEventHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '')
    .replace(/\son\w+='[^']*'/gi, '');
}

export function splitDescriptionParagraphs(text: string): string[] {
  const normalized = text.replace(/\r\n?/g, '\n').trim();
  const byBlankLine = normalized
    .split(/\n\s*\n+/)
    .map((part) => cleanDisplayText(part))
    .filter(Boolean);
  if (byBlankLine.length > 1) return byBlankLine;

  const single = cleanDisplayText(normalized);
  return single ? [single] : [];
}

export type TicketCategoryRow = {
  key: string;
  name: string;
  description: string | null;
  minPrice: number;
  maxPrice: number;
};

type RawTicketPrice = {
  title: string;
  description: string | null;
  priceRub: number;
  sortOrder: number | null;
};

function splitTitlePartsWithoutWeekdays(title: string): string[] {
  const parts = title.split(',').map((part) => part.trim()).filter(Boolean);
  const weekdayToken = /^(?:ПН|ВТ|СР|ЧТ|ПТ|СБ|ВС)$/iu;
  const weekdayRange = /^(?:ПН|ВТ|СР|ЧТ|ПТ|СБ|ВС)(?:\s*[,—–\-]\s*(?:ПН|ВТ|СР|ЧТ|ПТ|СБ|ВС))+$/iu;

  while (parts.length > 1) {
    const last = parts[parts.length - 1];
    if (weekdayToken.test(last) || weekdayRange.test(last)) {
      parts.pop();
      continue;
    }
    break;
  }

  return parts;
}

function isGenericTicketDescription(value?: string | null): boolean {
  const text = cleanDisplayText(value).toLowerCase();
  if (!text) return true;
  if (text.includes('покупка открывается в виджете')) return true;
  if (text.includes('уточняется в виджете')) return true;
  if (text.includes('минимальная доступная цена')) return true;
  return false;
}

function isTransportBoilerplate(value?: string | null): boolean {
  const text = cleanDisplayText(value);
  if (!text) return false;
  return /перевозка\s+пас[-.\s]?в/i.test(text) && /\bТС\s*\d+/i.test(text);
}

/** Убирает юридический хвост TC («перевозка пас-в … ТС 123») и оставляет имя категории. */
export function normalizeTicketCategoryLabel(raw?: string | null): string {
  let text = cleanDisplayText(raw);
  if (!text) return 'Билет';

  const dashSplit = text.split(/\s[-–—]\s/);
  if (dashSplit.length > 1) {
    const head = dashSplit[0]?.trim() || '';
    const tail = dashSplit.slice(1).join(' - ').trim();
    if (head && (!tail || isTransportBoilerplate(tail))) return head;
  }

  text = text
    .replace(/\s*[-–—]?\s*перевозка\s+пас[-.\s]?в\s+.+?\s+ТС\s*\d+\s*$/iu, '')
    .trim();

  const parts = splitTitlePartsWithoutWeekdays(text);
  if (parts.length > 1) {
    const tail = parts.slice(1).join(', ').trim();
    if (!tail || isTransportBoilerplate(tail)) return parts[0] || 'Билет';
  }

  return text || 'Билет';
}

function parseTicketCategory(item: { title: string; description?: string | null; priceRub: number }) {
  const name = normalizeTicketCategoryLabel(item.title);
  const parts = splitTitlePartsWithoutWeekdays(cleanDisplayText(item.title) || '');
  let parsedDescription = parts.length > 1 ? parts.slice(1).join(', ').trim() : null;
  if (parsedDescription && (isTransportBoilerplate(parsedDescription) || isGenericTicketDescription(parsedDescription))) {
    parsedDescription = null;
  }

  const apiDescription = cleanDisplayText(item.description);
  let description =
    parsedDescription || (apiDescription && !isGenericTicketDescription(apiDescription) ? apiDescription : null);
  if (description && isTransportBoilerplate(description)) description = null;

  return { name, description };
}

function collectRawTicketPrices(payload: PublicEventPageDto): RawTicketPrice[] {
  if (Array.isArray(payload.ticketPrices) && payload.ticketPrices.length) {
    return payload.ticketPrices
      .filter((price) => typeof price.priceRub === 'number' && price.priceRub >= MIN_DISPLAY_PRICE_RUB)
      .map((price) => ({
        title: cleanDisplayText(price.title) || 'Билет',
        description: cleanDisplayText(price.description) || null,
        priceRub: price.priceRub,
        sortOrder: price.sortOrder ?? null,
      }));
  }

  const eventTitleKey = cleanDisplayText(payload.event.title).toLowerCase().replace(/\s+/g, ' ');
  return (payload.offers ?? [])
    .filter((offer) => offer.active !== false && typeof offer.priceRub === 'number' && offer.priceRub >= MIN_DISPLAY_PRICE_RUB)
    .map((offer, index) => {
      const rawTitle = cleanDisplayText(offer.title) || '';
      const titleKey = rawTitle.toLowerCase().replace(/\s+/g, ' ');
      const title =
        !titleKey || titleKey === eventTitleKey || titleKey === 'widget' || titleKey.includes('ticketscloud widget')
          ? 'Билет'
          : rawTitle;
      return { title, description: null, priceRub: offer.priceRub as number, sortOrder: index };
    })
    .sort((a, b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999));
}

export function buildGroupedTicketCategories(payload: PublicEventPageDto): TicketCategoryRow[] {
  const order: string[] = [];
  const groupSortOrder = new Map<string, number>();
  const groups = new Map<string, TicketCategoryRow>();

  for (const item of collectRawTicketPrices(payload)) {
    const { name, description } = parseTicketCategory(item);
    const key = name.toLowerCase().replace(/\s+/g, ' ');
    const itemOrder = item.sortOrder ?? 9999;
    const existing = groups.get(key);
    if (!existing) {
      order.push(key);
      groups.set(key, { key, name, description, minPrice: item.priceRub, maxPrice: item.priceRub });
      groupSortOrder.set(key, itemOrder);
      continue;
    }
    existing.minPrice = Math.min(existing.minPrice, item.priceRub);
    existing.maxPrice = Math.max(existing.maxPrice, item.priceRub);
    groupSortOrder.set(key, Math.min(groupSortOrder.get(key) ?? 9999, itemOrder));
  }

  return order
    .map((key) => groups.get(key)!)
    .sort((a, b) => (groupSortOrder.get(a.key) ?? 9999) - (groupSortOrder.get(b.key) ?? 9999));
}

export function formatCategoryPrice(minPrice: number, maxPrice: number): string {
  if (minPrice === maxPrice) return `${formatNumber(Math.round(minPrice))} ₽`;
  return `${formatNumber(Math.round(minPrice))} – ${formatNumber(Math.round(maxPrice))} ₽`;
}

export function scrollToBuyCard() {
  const el = document.getElementById('buy-card') || document.getElementById('buy-card-desktop');
  el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

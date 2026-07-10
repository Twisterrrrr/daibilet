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

  if (Array.isArray(payload.ticketPrices)) {
    for (const item of payload.ticketPrices) {
      if (item.priceRub >= MIN_DISPLAY_PRICE_RUB) values.push(item.priceRub);
    }
  }

  for (const session of payload.sessions ?? []) {
    if (typeof session.priceFrom === 'number' && session.priceFrom >= MIN_DISPLAY_PRICE_RUB) {
      values.push(session.priceFrom);
    }
  }

  if (typeof payload.stats.priceFrom === 'number' && payload.stats.priceFrom >= MIN_DISPLAY_PRICE_RUB) {
    values.push(payload.stats.priceFrom);
  }
  if (typeof payload.event.priceFrom === 'number' && payload.event.priceFrom >= MIN_DISPLAY_PRICE_RUB) {
    values.push(payload.event.priceFrom);
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

export function buildGroupedTicketCategories(payload: PublicEventPageDto): TicketCategoryRow[] {
  if (!Array.isArray(payload.ticketPrices) || !payload.ticketPrices.length) return [];

  const order: string[] = [];
  const groups = new Map<string, TicketCategoryRow>();

  for (const item of payload.ticketPrices) {
    if (item.priceRub < MIN_DISPLAY_PRICE_RUB) continue;
    const name = item.title?.trim() || 'Билет';
    const description = cleanDisplayText(item.description) || null;
    const key = `${name}|${description || ''}`.toLowerCase();
    const existing = groups.get(key);
    if (!existing) {
      order.push(key);
      groups.set(key, { key, name, description, minPrice: item.priceRub, maxPrice: item.priceRub });
      continue;
    }
    existing.minPrice = Math.min(existing.minPrice, item.priceRub);
    existing.maxPrice = Math.max(existing.maxPrice, item.priceRub);
  }

  return order.map((key) => groups.get(key)!);
}

export function formatCategoryPrice(minPrice: number, maxPrice: number): string {
  if (minPrice === maxPrice) return `${formatNumber(Math.round(minPrice))} ₽`;
  return `${formatNumber(Math.round(minPrice))} – ${formatNumber(Math.round(maxPrice))} ₽`;
}

export function scrollToBuyCard() {
  const el = document.getElementById('buy-card') || document.getElementById('buy-card-desktop');
  el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

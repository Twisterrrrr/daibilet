'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { buildCatalogHref } from '@/lib/catalog-url';

const DOW = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
const MONTH = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

export function EventsDateCalendar({ items, citySlug }: { items: Array<{ startsAt: string }>; citySlug?: string | null }) {
  const calendarRef = useRef<HTMLDivElement>(null);
  const withEvents = new Set(items.map((item) => String(item.startsAt || '').slice(0, 10)));
  const today = new Date();
  const days = Array.from({ length: 14 }, (_, index) => {
    const date = new Date(today);
    date.setDate(date.getDate() + index);
    const dayOfWeek = date.getDay();
    const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const classes = ['cal-day'];
    if (dayOfWeek === 0 || dayOfWeek === 6) classes.push('is-weekend');
    if (index === 0) classes.push('is-today');
    if (!withEvents.has(iso)) classes.push('is-empty');
    return (
      <Link key={iso} href={buildCatalogHref({ from: iso, to: iso, city: citySlug || undefined })} className={classes.join(' ')} aria-label={`События ${date.getDate()} ${MONTH[date.getMonth()]}`}>
        <span className="cal-day__dow">{index === 0 ? 'Сегодня' : DOW[dayOfWeek]}</span>
        <span className="cal-day__num">{date.getDate()}</span>
        <span className="cal-day__month">{MONTH[date.getMonth()]}</span>
      </Link>
    );
  });

  const scroll = (direction: -1 | 1) => {
    const element = calendarRef.current;
    if (!element) return;
    element.scrollBy({ left: direction * Math.max(element.clientWidth * 0.72, 320), behavior: 'smooth' });
  };

  return (
    <div className="calendar-wrap">
      <button type="button" className="calendar-arrow calendar-arrow--left" aria-label="Показать предыдущие даты" onClick={() => scroll(-1)}><ChevronLeft aria-hidden /></button>
      <div className="calendar" ref={calendarRef}>{days}</div>
      <button type="button" className="calendar-arrow calendar-arrow--right" aria-label="Показать следующие даты" onClick={() => scroll(1)}><ChevronRight aria-hidden /></button>
    </div>
  );
}

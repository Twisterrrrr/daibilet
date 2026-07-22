import Link from 'next/link';
import { HelpCircle, RotateCcw, ShieldCheck, Ticket } from 'lucide-react';

import type { PublicEventDto } from '@daibilet/contracts/public';

import { formatEventDescriptionHtml } from '@/lib/event-description-format';
import { uniqueEventTagLabels } from '@/lib/event-tag-labels';

export function EventDescription({ event }: { event: PublicEventDto }) {
  const description = String(event.description || '').trim();
  if (!description) return null;
  const html = formatEventDescriptionHtml(description);
  if (!html) return null;

  return (
    <div>
      <h2 className="text-lg font-bold text-slate-900">О событии</h2>
      <div
        className="prose prose-slate mt-4 max-w-none text-sm leading-7 text-slate-600 [&_h3]:mt-5 [&_h3]:mb-2 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-slate-900 [&_li+li]:mt-2 [&_p+p]:mt-5 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5 [&_h3+ul]:mt-2"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}

export function EventQuickInfo({ event }: { event: PublicEventDto }) {
  const items: string[] = [];
  if (event.venueAddress) items.push(event.venueAddress);
  if (event.venue && !items.includes(event.venue)) items.push(event.venue);
  if (event.ageLimit) items.push(`${event.ageLimit}+`);

  if (!items.length) return null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Кратко</h2>
      <ul className="mt-3 space-y-2 text-sm text-slate-700">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export function EventTags({ event }: { event: PublicEventDto }) {
  const rawTags = Array.isArray(event.tags) ? event.tags : [];
  const rawSubcategories = Array.isArray(event.subcategories) ? event.subcategories : [];
  // API often mirrors genre labels into both tags and subcategories — merge without dupes.
  const tags = uniqueEventTagLabels([...rawTags, ...rawSubcategories], 12);
  if (!tags.length) return null;

  return (
    <div>
      <h2 className="text-lg font-bold text-slate-900">Теги</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {tags.map((tag) => (
          <span key={tag.toLocaleLowerCase('ru')} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

const TRUST_LINKS = [
  { href: '/help', label: 'Как купить и получить билет', icon: Ticket },
  { href: '/legal#refunds', label: 'Правила возврата', icon: RotateCcw },
  { href: '/contacts', label: 'Поддержка и контакты', icon: HelpCircle },
  { href: '/offer', label: 'Оферта и условия', icon: ShieldCheck },
] as const;

/** Trust / E-E-A-T strip: путь покупки и поддержка без дублирования thin-контента события. */
export function EventTrustStrip() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5">
      <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Покупка и поддержка</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Билет оформляется через систему организатора. На Дайбилет - сравнение предложений, карточка события и помощь по
        заказу.
      </p>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {TRUST_LINKS.map(({ href, label, icon: Icon }) => (
          <li key={href}>
            <Link
              href={href}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-800 transition hover:border-primary/40 hover:text-primary-700"
            >
              <Icon className="h-4 w-4 shrink-0 text-primary-600" />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

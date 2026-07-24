import Link from 'next/link';
import { Clock, HelpCircle, MapPin, RotateCcw, ShieldCheck, Ticket, Users } from 'lucide-react';

import type { PublicEventDto } from '@daibilet/contracts/public';

import { extractDurationLabel } from '@/lib/catalog-labels';
import { formatEventDescriptionHtml } from '@/lib/event-description-format';
import { formatAgeLimit } from '@/lib/event-page-utils';
import { uniqueEventTagLabels } from '@/lib/event-tag-labels';

export function EventDescription({ event }: { event: PublicEventDto }) {
  const description = String(event.description || '').trim();
  if (!description) return null;
  const html = formatEventDescriptionHtml(description);
  if (!html) return null;

  return (
    <div>
      <h2 className="text-lg font-bold text-graphite">О событии</h2>
      <div
        className="prose prose-slate mt-5 max-w-none text-sm leading-7 text-graphite-muted [&_h3]:mt-5 [&_h3]:mb-2 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-graphite [&_li+li]:mt-2 [&_p+p]:mt-5 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5 [&_h3+ul]:mt-2"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}

export function EventQuickInfo({ event }: { event: PublicEventDto }) {
  const ageLimit = formatAgeLimit(event.ageLimit);
  const durationLabel = extractDurationLabel(event.tags);
  const items: Array<{ icon: typeof MapPin; label: string }> = [];

  if (event.venueAddress) items.push({ icon: MapPin, label: event.venueAddress });
  else if (event.venue) items.push({ icon: MapPin, label: event.venue });
  if (durationLabel) items.push({ icon: Clock, label: durationLabel });
  if (ageLimit) items.push({ icon: Users, label: ageLimit });

  if (!items.length) return null;

  return (
    <div>
      <h2 className="text-sm font-semibold uppercase tracking-wider text-graphite-muted">Кратко</h2>
      <ul className="mt-4 space-y-3">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.label} className="flex items-start gap-2.5 text-sm text-graphite">
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-graphite-muted" strokeWidth={1.75} />
              <span>{item.label}</span>
            </li>
          );
        })}
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
      <h2 className="text-lg font-bold text-graphite">Теги</h2>
      <div className="mt-4 flex flex-wrap gap-2">
        {tags.map((tag) => (
          <span
            key={tag.toLocaleLowerCase('ru')}
            className="rounded-lg bg-surface-muted px-3 py-1.5 text-xs font-medium text-graphite-muted"
          >
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
    <section>
      <h2 className="text-sm font-semibold uppercase tracking-wider text-graphite-muted">Покупка и поддержка</h2>
      <p className="mt-3 text-sm leading-6 text-graphite-muted">
        Билет оформляется через систему организатора. На Дайбилет - сравнение предложений, карточка события и помощь по
        заказу.
      </p>
      <ul className="mt-5 grid gap-2 sm:grid-cols-2">
        {TRUST_LINKS.map(({ href, label, icon: Icon }) => (
          <li key={href}>
            <Link
              href={href}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-graphite transition hover:bg-surface-muted hover:text-primary-700"
            >
              <Icon className="h-4 w-4 shrink-0 text-graphite-muted" strokeWidth={1.75} />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

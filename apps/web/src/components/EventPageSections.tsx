import type { PublicEventDto } from '@daibilet/contracts/public';

import { formatEventDescriptionHtml } from '@/lib/event-description-format';

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
  const tags = [...rawTags, ...rawSubcategories].filter(Boolean).slice(0, 12);
  if (!tags.length) return null;

  return (
    <div>
      <h2 className="text-lg font-bold text-slate-900">Теги</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {tags.map((tag) => (
          <span key={tag} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

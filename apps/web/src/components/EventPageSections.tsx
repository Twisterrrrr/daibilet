import type { PublicEventDto } from '@daibilet/contracts/public';

import {
  cleanDisplayText,
  sanitizeEventHtml,
  splitDescriptionParagraphs,
} from '@/lib/event-page-utils';

export function EventDescription({ event }: { event: PublicEventDto }) {
  const description = String(event.description || '').trim();
  if (!description) return null;
  const hasHtml = /<[a-z][\s\S]*>/i.test(description);

  return (
    <div>
      <h2 className="text-lg font-bold text-slate-900">О событии</h2>
      {hasHtml ? (
        <div
          className="prose prose-slate mt-4 max-w-none text-sm leading-7 text-slate-600 [&_li+li]:mt-2 [&_p+p]:mt-5 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5"
          dangerouslySetInnerHTML={{ __html: sanitizeEventHtml(description) }}
        />
      ) : (
        <div className="mt-4 max-w-none space-y-5 text-sm leading-7 text-slate-600">
          {splitDescriptionParagraphs(description).map((paragraph, index) => (
            <p key={index}>{cleanDisplayText(paragraph)}</p>
          ))}
        </div>
      )}
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
  const tags = [...(event.tags || []), ...(event.subcategories || [])].filter(Boolean).slice(0, 12);
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

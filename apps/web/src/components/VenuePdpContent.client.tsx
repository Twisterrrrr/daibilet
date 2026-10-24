'use client';

import type { PublicPdpDocumentDto } from '@daibilet/contracts/public';
import { SafeImage } from '@/components/SafeImage.client';

const variantTitles: Record<string, string> = {
  museum: 'О музее', theater: 'О площадке', concert_hall: 'О площадке', club: 'О площадке',
  pier: 'Причал и маршруты', landmark: 'О достопримечательности', nature: 'О месте',
  urban_area: 'О районе', food: 'О месте', attraction: 'О месте', transport: 'О маршруте',
  park: 'О парке', space: 'О пространстве', religion: 'О месте', sport: 'О площадке', venue: 'О месте',
};

function safePublicUrl(value?: string | null): string | null {
  const url = String(value || '').trim();
  if (url.startsWith('/') && !url.startsWith('//')) return url;
  return /^https:\/\//i.test(url) ? url : null;
}

export function VenuePdpContent({ document }: { document?: PublicPdpDocumentDto | null }) {
  if (!document) return null;
  const content = document.content;
  const sections = (content.sections || []).filter((section) =>
    Boolean(section.title?.trim() || section.body?.trim() || section.items?.length),
  );
  const gallery = (content.gallery || []).filter((image) => safePublicUrl(image.url));
  const facts = (content.facts || []).filter((fact) => fact.label.trim() && fact.value.trim());
  if (!content.summary?.trim() && !sections.length && !gallery.length && !facts.length) return null;

  return (
    <div className="space-y-10 py-6 sm:py-8" data-editorial-pdp={document.variant}>
      {content.summary?.trim() ? (
        <section className="max-w-3xl">
          <h2 className="font-display text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
            {variantTitles[document.variant] || 'О месте'}
          </h2>
          <p className="mt-4 whitespace-pre-line text-base leading-7 text-slate-700">{content.summary}</p>
        </section>
      ) : null}

      {facts.length ? (
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {facts.map((fact, index) => (
            <div key={`${fact.label}-${index}`} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <dt className="text-xs font-medium text-slate-500">{fact.label}</dt>
              <dd className="mt-1 text-sm font-semibold leading-6 text-slate-900">{fact.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {gallery.length ? (
        <section aria-label="Фотографии места">
          <div className="flex gap-3 overflow-x-auto pb-2">
            {gallery.map((image, index) => {
              const src = safePublicUrl(image.url);
              if (!src) return null;
              return (
                <figure key={`${src}-${index}`} className="w-[min(82vw,28rem)] shrink-0">
                  <div className="relative h-52 overflow-hidden rounded-xl bg-slate-100 sm:h-64">
                    <SafeImage src={src} alt={image.alt || ''} fill sizes="(max-width: 640px) 82vw, 28rem" className="object-cover" />
                  </div>
                  {image.caption || image.credit ? (
                    <figcaption className="mt-2 text-xs text-slate-500">
                      {image.caption}{image.caption && image.credit ? ' · ' : ''}{image.credit}
                    </figcaption>
                  ) : null}
                </figure>
              );
            })}
          </div>
        </section>
      ) : null}

      {sections.map((section) => (
        <section key={section.id} className="max-w-4xl scroll-mt-24" data-pdp-section={section.kind}>
          <h2 className="font-display text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">
            {section.title?.trim() || variantTitles[document.variant] || 'Подробнее'}
          </h2>
          {section.body?.trim() ? (
            <div className="mt-4 whitespace-pre-line text-sm leading-7 text-slate-700">{section.body}</div>
          ) : null}
          {section.items?.length ? (
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {section.items.map((item, index) => {
                const imageUrl = safePublicUrl(item.imageUrl);
                const href = safePublicUrl(item.linkUrl);
                const card = (
                  <article className="h-full rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-slate-300">
                    {imageUrl ? (
                      <div className="relative mb-4 aspect-[16/9] overflow-hidden rounded-lg bg-slate-100">
                        <SafeImage src={imageUrl} alt="" fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" />
                      </div>
                    ) : null}
                    <h3 className="font-semibold text-slate-900">{item.title}</h3>
                    {item.meta ? <p className="mt-1 text-xs font-medium text-slate-500">{item.meta}</p> : null}
                    {item.description ? <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">{item.description}</p> : null}
                    {item.details?.length ? (
                      <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                        {item.details.map((detail, detailIndex) => (
                          <div key={`${detail.label}-${detailIndex}`}>
                            <dt className="text-[11px] text-slate-500">{detail.label}</dt>
                            <dd className="text-xs font-medium text-slate-800">{detail.value}</dd>
                          </div>
                        ))}
                      </dl>
                    ) : null}
                  </article>
                );
                return href ? <a key={`${item.title}-${index}`} href={href} className="block">{card}</a> : <div key={`${item.title}-${index}`}>{card}</div>;
              })}
            </div>
          ) : null}
        </section>
      ))}
    </div>
  );
}

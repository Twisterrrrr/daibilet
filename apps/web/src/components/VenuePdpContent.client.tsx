'use client';

import type { PublicPdpDocumentDto } from '@daibilet/contracts/public';
import { SafeImage } from '@/components/SafeImage.client';

const variantTitles: Record<string, string> = {
  event: 'О событии',
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

export function VenuePdpContent({ document, showSummary = true, showSections = true, hideAddressFact = false }: {
  document?: PublicPdpDocumentDto | null;
  showSummary?: boolean;
  showSections?: boolean;
  hideAddressFact?: boolean;
}) {
  if (!document) return null;
  const content = document.content;
  const shouldHideAddressFact = hideAddressFact || document.variant === 'pier';
  const sections = showSections ? (content.sections || []).filter((section) =>
    Boolean(section.title?.trim() || section.body?.trim() || section.items?.length),
  ) : [];
  const gallery = (content.gallery || []).filter((image) => safePublicUrl(image.url));
  const facts = (content.facts || []).filter((fact) =>
    fact.label.trim() &&
    fact.value.trim() &&
    !(shouldHideAddressFact && /^адрес(?:\s|$)/iu.test(fact.label.trim())),
  );
  const primarySections = sections.slice(0, 2);
  const additionalSections = sections.slice(2);
  if (!(showSummary && content.summary?.trim()) && !sections.length && !gallery.length && !facts.length) return null;

  return (
    <div className="space-y-8 py-6 sm:py-8" data-editorial-pdp={document.variant}>
      {showSummary && content.summary?.trim() ? (
        <section id="about" className="max-w-3xl scroll-mt-24">
          <h2 className="font-display text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">
            {variantTitles[document.variant] || 'О месте'}
          </h2>
          <p className="venue-md-body mt-3 whitespace-pre-line">{content.summary}</p>
        </section>
      ) : null}

      {facts.length ? (
        <dl className="grid max-w-3xl gap-3 sm:grid-cols-2">
          {facts.map((fact, index) => (
            <div key={`${fact.label}-${index}`} className="rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
              <dt className="text-xs font-medium text-slate-500">{fact.label}</dt>
              <dd className="mt-1 text-sm font-semibold leading-6 text-slate-900">{fact.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {gallery.length ? (
        <section aria-label={document.variant === 'event' ? 'Фотографии события' : 'Фотографии места'}>
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

      {primarySections.map((section, index) => (
        <PdpSection key={section.id} section={section} anchorIndex={index} />
      ))}

      {additionalSections.length ? (
        <div id="pdp-more-sections" className="max-w-4xl space-y-2 scroll-mt-24">
          {additionalSections.map((section) => (
            <details key={section.id} className="group rounded-xl border border-slate-200 bg-white px-4 py-3">
              <summary className="cursor-pointer list-none pr-7 font-semibold text-slate-900 marker:hidden">
                <span className="flex items-center justify-between gap-4">
                  {section.title?.trim() || variantTitles[document.variant] || 'Подробнее'}
                  <span aria-hidden="true" className="text-lg font-normal text-slate-400 transition group-open:rotate-45">+</span>
                </span>
              </summary>
              <div className="pt-3">
                <PdpSectionBody section={section} />
              </div>
            </details>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function PdpSection({
  section,
  anchorIndex,
}: {
  section: NonNullable<PublicPdpDocumentDto['content']['sections']>[number];
  anchorIndex: number;
}) {
  return (
    <section
      id={`pdp-section-${anchorIndex}`}
      className="max-w-4xl scroll-mt-24"
      data-pdp-section={section.kind}
    >
      {section.kind === 'custom' ? (
        <h3 className="font-display text-lg font-bold tracking-tight text-slate-950 sm:text-xl">
          {section.title?.trim() || 'Дополнительный раздел'}
        </h3>
      ) : (
        <h2 className="font-display text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">
          {section.title?.trim() || 'Подробнее'}
        </h2>
      )}
      <PdpSectionBody section={section} />
    </section>
  );
}

function PdpSectionBody({
  section,
}: {
  section: NonNullable<PublicPdpDocumentDto['content']['sections']>[number];
}) {
  return (
    <>
      {section.body?.trim() ? (
        <div className="venue-md-body mt-3 whitespace-pre-line">{section.body}</div>
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
                {item.description ? <p className="venue-md-body mt-2 whitespace-pre-line">{item.description}</p> : null}
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
    </>
  );
}

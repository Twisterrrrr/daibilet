'use client';

import {
  resolveSeoListingText,
  splitSeoListingParagraphs,
} from '@/data/seo-listing-texts';
import { buildLandingOnPageSeoText, type LandingSeoInput } from '@/lib/landing-seo';
import { canonicalLandingSlug } from '@/lib/landing-constants';
import { sanitizeEventHtml } from '@/lib/event-description-format';

type LandingSeoBottomProps = {
  landingSlug: string;
  citySlug?: string | null;
  seoInput: LandingSeoInput;
  /** CMS уже дал длинный SEO_TEXT / STORY - не дублируем. */
  hasCmsSeoText?: boolean;
  /** SeoOverride.customText (HTML) - приоритет над editorial seed. */
  overrideHtml?: string | null;
  /** Optional H2 when override HTML is present. */
  overrideHeading?: string | null;
};

/**
 * On-page SEO блок строго под выдачей:
 * SeoOverride HTML → editorial seed → fallback-шаблон.
 * Ширина = content container (без max-w, родитель уже container-page).
 */
export function LandingSeoBottom({
  landingSlug,
  citySlug,
  seoInput,
  hasCmsSeoText,
  overrideHtml,
  overrideHeading,
}: LandingSeoBottomProps) {
  const html = sanitizeEventHtml(String(overrideHtml || '').trim());
  if (html) {
    return (
      <section id="seo" className="w-full border-t border-slate-100 py-12">
        <h2 className="text-xl font-bold text-slate-900 md:text-2xl">
          {String(overrideHeading || '').trim() || 'Подробнее о направлении'}
        </h2>
        <div
          className="prose prose-slate mt-4 max-w-none text-sm leading-7 text-slate-600 md:text-base prose-headings:text-slate-900 prose-strong:text-slate-800"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </section>
    );
  }

  if (hasCmsSeoText) return null;

  const editorial = resolveSeoListingText(canonicalLandingSlug(landingSlug), citySlug);
  const heading = editorial?.heading || 'Подробнее о направлении';
  const body = editorial?.body || buildLandingOnPageSeoText(seoInput);
  const paragraphs = splitSeoListingParagraphs(body);
  if (!paragraphs.length) return null;

  return (
    <section id="seo" className="w-full border-t border-slate-100 py-12">
      <h2 className="text-xl font-bold text-slate-900 md:text-2xl">{heading}</h2>
      <div className="mt-4 max-w-none space-y-4 text-sm leading-7 text-slate-600 md:text-base">
        {paragraphs.map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </div>
    </section>
  );
}

export function landingBlocksHaveSeoText(
  blocks: Array<{ type?: string; body?: string | null }> | null | undefined,
): boolean {
  if (!blocks?.length) return false;
  return blocks.some((block) => {
    const body = String(block.body || '').trim();
    if (block.type === 'SEO_TEXT' || block.type === 'RAW_RICH_TEXT') return body.length >= 200;
    if (block.type === 'STORY') return body.length >= 400;
    return false;
  });
}

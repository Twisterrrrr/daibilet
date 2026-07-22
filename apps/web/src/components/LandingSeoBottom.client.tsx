'use client';

import { resolveSeoListingText } from '@/data/seo-listing-texts';
import { buildLandingOnPageSeoText, type LandingSeoInput } from '@/lib/landing-seo';
import { canonicalLandingSlug } from '@/lib/landing-constants';

type LandingSeoBottomProps = {
  landingSlug: string;
  citySlug?: string | null;
  seoInput: LandingSeoInput;
  /** CMS уже дал длинный SEO_TEXT / STORY - не дублируем. */
  hasCmsSeoText?: boolean;
};

/**
 * On-page SEO блок строго под выдачей: editorial seed → fallback-шаблон.
 */
export function LandingSeoBottom({
  landingSlug,
  citySlug,
  seoInput,
  hasCmsSeoText,
}: LandingSeoBottomProps) {
  if (hasCmsSeoText) return null;

  const editorial = resolveSeoListingText(canonicalLandingSlug(landingSlug), citySlug);
  const heading = editorial?.heading || 'Подробнее о направлении';
  const body = editorial?.body || buildLandingOnPageSeoText(seoInput);
  if (!body) return null;

  return (
    <section id="seo" className="border-t border-slate-100 py-12">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-xl font-bold text-slate-900 md:text-2xl">{heading}</h2>
        <div className="mt-4 space-y-4 text-sm leading-7 text-slate-600 md:text-base">
          {body.split(/\n+/).map((paragraph, index) => (
            <p key={index}>{paragraph.trim()}</p>
          ))}
        </div>
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

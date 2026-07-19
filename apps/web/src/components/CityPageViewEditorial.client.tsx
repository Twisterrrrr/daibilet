'use client';

import { CityPageView } from '@/components/CityPageView.client';
import type { CityFaqItem } from '@/lib/city-faq';
import type { PublicCityPageDto } from '@daibilet/contracts/public';

/** Параллельный visual template хаба (Lovable moodboard → Tailwind DS). Default phase 1 не трогает. */
export function CityPageViewEditorial({
  slug,
  initialPayload,
  faqItems = [],
  seoText = null,
}: {
  slug: string;
  initialPayload: PublicCityPageDto | null;
  faqItems?: CityFaqItem[];
  seoText?: string | null;
}) {
  return (
    <CityPageView
      slug={slug}
      initialPayload={initialPayload}
      faqItems={faqItems}
      seoText={seoText}
      hubTemplate="editorial"
    />
  );
}

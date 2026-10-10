import { CityPageView } from '@/components/CityPageView.client';
import type { CityFaqItem } from '@/lib/city-faq';
import type { CityHubArticlesBuckets } from '@/lib/city-hub-articles';
import type { FinanceAdmissionListResult } from '@/lib/finance-projection';
import type { PublicCityPageDto } from '@daibilet/contracts/public';

/** Параллельный visual template хаба (Lovable moodboard → Tailwind DS). Default phase 1 не трогает. */
export function CityPageViewEditorial({
  slug,
  initialPayload,
  faqItems = [],
  seoText = null,
  hubArticles = null,
  admission = null,
}: {
  slug: string;
  initialPayload: PublicCityPageDto | null;
  faqItems?: CityFaqItem[];
  seoText?: string | null;
  hubArticles?: CityHubArticlesBuckets | null;
  admission?: FinanceAdmissionListResult | null;
}) {
  return (
    <CityPageView
      slug={slug}
      initialPayload={initialPayload}
      faqItems={faqItems}
      seoText={seoText}
      hubArticles={hubArticles}
      hubTemplate="editorial"
      admission={admission}
    />
  );
}

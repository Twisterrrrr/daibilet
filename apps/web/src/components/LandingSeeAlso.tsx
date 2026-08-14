import Link from 'next/link';

import { cityToPrepositional } from '@/lib/city-declension';
import type { SeoLink } from '@/lib/seo-internal-links';

type LandingSeeAlsoProps = {
  cityName: string;
  links: SeoLink[];
};

/** Блок смежных категорий под сеткой листинга, над SEO-текстом. */
export function LandingSeeAlso({ cityName, links }: LandingSeeAlsoProps) {
  if (!links.length || !cityName) return null;
  const cityPrep = cityToPrepositional(cityName);

  return (
    <section className="border-t border-slate-100 py-8" aria-label="Смотрите также">
      <p className="text-sm leading-7 text-slate-600 md:text-base">
        Также в {cityPrep} часто ищут:{' '}
        {links.map((link, index) => (
          <span key={link.href}>
            {index > 0 ? ', ' : null}
            <Link href={link.href} className="font-medium text-primary-700 underline-offset-2 hover:underline">
              {link.label}
            </Link>
          </span>
        ))}
        .
      </p>
    </section>
  );
}

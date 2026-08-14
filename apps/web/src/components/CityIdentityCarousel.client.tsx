'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { CityHubSectionHeading, HUB_SECTION_GAP } from '@/components/CityHubSectionHeading';
import { IMAGE_SIZES, SafeImage } from '@/components/SafeImage.client';
import {
  cityIdentitySlides,
  focusFromIdentitySlide,
  resolveCityLocalFlavor,
  type CityPlaceFocus,
} from '@/lib/city-hub-local-flavor';

type Props = {
  citySlug: string;
  editorial?: boolean;
  /** Sticky-tab / hash target. Perm: «Зачем ехать» lands on this carousel. */
  sectionId?: string;
  onSelect: (focus: CityPlaceFocus) => void;
};

export function CityIdentityCarousel({ citySlug, editorial = false, sectionId, onSelect }: Props) {
  const slides = cityIdentitySlides(citySlug);
  const flavor = resolveCityLocalFlavor(citySlug);
  const heading = flavor?.identityHeading || 'Чем уникален город';
  const lead = flavor?.identityLead?.trim() || '';
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  const syncIndex = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const cards = el.querySelectorAll<HTMLElement>('[data-identity-slide]');
    const card = cards[0];
    if (!card) return;
    const step = card.getBoundingClientRect().width + 16;
    if (step < 1) return;
    setIndex(Math.max(0, Math.min(slides.length - 1, Math.round(el.scrollLeft / step))));
  }, [slides.length]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.addEventListener('scroll', syncIndex, { passive: true });
    return () => el.removeEventListener('scroll', syncIndex);
  }, [syncIndex]);

  const scrollTo = (next: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    const cards = el.querySelectorAll<HTMLElement>('[data-identity-slide]');
    const card = cards[Math.max(0, Math.min(slides.length - 1, next))];
    card?.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
  };

  if (!slides.length) return null;

  return (
    <section
      id={sectionId}
      className={`${HUB_SECTION_GAP} ${sectionId ? 'scroll-mt-[calc(var(--site-header-height)+3.25rem)]' : ''}`.trim()}
      data-city-identity-carousel
    >
      <CityHubSectionHeading
        title={heading}
        description={lead}
        editorial={editorial}
        actions={
          slides.length > 1 ? (
            <div className="flex shrink-0 gap-2 pt-0.5">
              <button
                type="button"
                aria-label="Предыдущий слайд"
                onClick={() => scrollTo(index - 1)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden />
              </button>
              <button
                type="button"
                aria-label="Следующий слайд"
                onClick={() => scrollTo(index + 1)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50"
              >
                <ChevronRight className="h-4 w-4" aria-hidden />
              </button>
            </div>
          ) : null
        }
      />
      <div
        ref={scrollerRef}
        className="mt-5 flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden [&::-webkit-scrollbar]:h-0"
        aria-label={heading}
      >
        {slides.map((slide) => (
          <article
            key={slide.id}
            data-identity-slide={slide.id}
            className={
              editorial
                ? 'w-[min(100%,19.5rem)] shrink-0 snap-start overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm'
                : 'w-[min(100%,19.5rem)] shrink-0 snap-start overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.06)]'
            }
          >
            <button
              type="button"
              className="block w-full text-left"
              onClick={() => onSelect(focusFromIdentitySlide(slide))}
            >
              <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
                <SafeImage
                  src={slide.imageSrc}
                  alt={slide.imageAlt}
                  fill
                  sizes={IMAGE_SIZES.cityCard}
                  className="object-cover"
                />
                {slide.badge ? (
                  <span className="absolute left-3 top-3 inline-flex rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm">
                    {slide.badge}
                  </span>
                ) : null}
              </div>
              <div className="px-4 py-4">
                <h3 className={`text-base font-bold leading-snug ${editorial ? 'text-zinc-950' : 'text-slate-950'}`}>
                  {slide.title}
                </h3>
                <p className={`mt-2 text-sm leading-6 ${editorial ? 'text-zinc-600' : 'text-slate-600'}`}>
                  {slide.text}
                </p>
              </div>
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

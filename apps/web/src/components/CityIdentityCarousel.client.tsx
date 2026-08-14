'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

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
  onSelect: (focus: CityPlaceFocus) => void;
};

export function CityIdentityCarousel({ citySlug, editorial = false, onSelect }: Props) {
  const slides = cityIdentitySlides(citySlug);
  const heading = resolveCityLocalFlavor(citySlug)?.identityHeading || 'Чем уникален город?';
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
    <section className="mt-8" data-city-identity-carousel>
      <div className="flex items-end justify-between gap-3">
        <h2
          className={
            editorial
              ? 'font-serif text-2xl font-semibold text-zinc-950 sm:text-3xl'
              : 'text-xl font-bold text-slate-950 sm:text-2xl'
          }
        >
          {heading}
        </h2>
        {slides.length > 1 ? (
          <div className="hidden shrink-0 gap-2 sm:flex">
            <button
              type="button"
              aria-label="Предыдущий слайд"
              onClick={() => scrollTo(index - 1)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </button>
            <button
              type="button"
              aria-label="Следующий слайд"
              onClick={() => scrollTo(index + 1)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            >
              <ChevronRight className="h-4 w-4" aria-hidden />
            </button>
          </div>
        ) : null}
      </div>
      <div
        ref={scrollerRef}
        className="mt-4 flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label={heading}
      >
        {slides.map((slide) => (
          <article
            key={slide.id}
            data-identity-slide={slide.id}
            className="w-[min(100%,19.5rem)] shrink-0 snap-start overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200/80"
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
              </div>
              <div className="px-4 py-3.5">
                <h3 className={`text-base font-semibold ${editorial ? 'text-zinc-950' : 'text-slate-950'}`}>
                  {slide.title}
                </h3>
                <p className={`mt-1.5 text-sm leading-6 ${editorial ? 'text-zinc-600' : 'text-slate-600'}`}>
                  {slide.text}
                </p>
              </div>
            </button>
          </article>
        ))}
      </div>
      {slides.length > 1 ? (
        <div className="mt-3 flex justify-center gap-1.5" aria-hidden>
          {slides.map((slide, i) => (
            <button
              key={slide.id}
              type="button"
              aria-label={`Слайд ${i + 1}`}
              onClick={() => scrollTo(i)}
              className={`h-1.5 rounded-full transition ${
                i === index ? 'w-5 bg-slate-900' : 'w-1.5 bg-slate-300'
              }`}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

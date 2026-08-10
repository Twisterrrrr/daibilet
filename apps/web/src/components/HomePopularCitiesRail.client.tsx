'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { CityCard } from '@/components/CityCard';
import type { PublicDestinationDto } from '@daibilet/contracts/public';

const LOOP_COPIES = 3;
const HIDE_SCROLLBAR_CLASS =
  '![scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:!hidden';

type HomePopularCitiesRailProps = {
  cities: PublicDestinationDto[];
  className?: string;
};

function measureStep(scroller: HTMLElement): number {
  const card = scroller.querySelector<HTMLElement>('[data-rail-item]');
  if (!card) return 200;
  const track = card.parentElement;
  const gapRaw = track ? getComputedStyle(track).gap || getComputedStyle(track).columnGap : '0';
  const gap = Number.parseFloat(gapRaw) || 0;
  return Math.max(160, Math.round(card.getBoundingClientRect().width + gap));
}

/**
 * Edge-to-edge infinite city cards: peeks past both viewport edges, loops seamlessly.
 */
export function HomePopularCitiesRail({ cities, className = '' }: HomePopularCitiesRailProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const loopingRef = useRef(false);
  const [ready, setReady] = useState(false);

  const loopItems = useMemo(
    () =>
      Array.from({ length: LOOP_COPIES }, (_, copy) =>
        cities.map((city, index) => ({
          city,
          key: `${copy}:${city.slug || city.name}:${index}`,
        })),
      ).flat(),
    [cities],
  );

  const normalizeLoop = useCallback(() => {
    const el = scrollerRef.current;
    if (!el || cities.length < 2 || loopingRef.current) return;
    const setWidth = el.scrollWidth / LOOP_COPIES;
    if (setWidth < 1) return;
    if (el.scrollLeft < setWidth * 0.5) {
      loopingRef.current = true;
      el.scrollLeft += setWidth;
      loopingRef.current = false;
    } else if (el.scrollLeft > setWidth * 1.5) {
      loopingRef.current = true;
      el.scrollLeft -= setWidth;
      loopingRef.current = false;
    }
  }, [cities.length]);

  const jumpToMiddle = useCallback(() => {
    const el = scrollerRef.current;
    if (!el || cities.length === 0) return;
    const setWidth = el.scrollWidth / LOOP_COPIES;
    if (setWidth < 1) return;
    // Left tail peek: start mid-set offset so previous cities enter from the left edge.
    const peek = Math.min(measureStep(el) * 0.35, 72);
    loopingRef.current = true;
    el.scrollLeft = setWidth - peek;
    loopingRef.current = false;
    setReady(true);
  }, [cities.length]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    jumpToMiddle();

    const onScroll = () => {
      if (loopingRef.current) return;
      normalizeLoop();
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', jumpToMiddle, { passive: true });

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => jumpToMiddle()) : null;
    ro?.observe(el);

    return () => {
      el.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', jumpToMiddle);
      ro?.disconnect();
    };
  }, [jumpToMiddle, normalizeLoop, loopItems.length]);

  const scrollByDir = (dir: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollBy({
      left: dir * measureStep(el),
      behavior: reduceMotion ? 'auto' : 'smooth',
    });
  };

  if (!cities.length) return null;

  const arrowBase =
    'absolute z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200/90 bg-white/95 text-slate-700 shadow-md backdrop-blur transition-[opacity,transform,colors] hover:bg-white hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2 md:inline-flex top-[33%]';

  return (
    <div className={`relative min-w-0 ${className}`.trim()}>
      <div
        ref={scrollerRef}
        className={`home-edge-cities-rail horizontal-snap-row touch-pan-x flex flex-nowrap gap-3 snap-x snap-mandatory sm:gap-3.5 ${HIDE_SCROLLBAR_CLASS} ${
          ready ? 'opacity-100' : 'opacity-0'
        } transition-opacity duration-200`}
        aria-label="Популярные города"
        role="region"
        tabIndex={0}
      >
        {loopItems.map(({ city, key }) => (
          <div
            key={key}
            className="w-[min(52vw,196px)] shrink-0 snap-start sm:w-[168px] lg:w-[176px]"
            data-rail-item
          >
            <CityCard city={city} compact />
          </div>
        ))}
      </div>

      {cities.length > 1 ? (
        <>
          <button
            type="button"
            aria-label="Прокрутить влево"
            onClick={() => scrollByDir(-1)}
            className={`${arrowBase} left-3`}
          >
            <ChevronLeft className="h-5 w-5" aria-hidden />
          </button>
          <button
            type="button"
            aria-label="Прокрутить вправо"
            onClick={() => scrollByDir(1)}
            className={`${arrowBase} right-3`}
          >
            <ChevronRight className="h-5 w-5" aria-hidden />
          </button>
        </>
      ) : null}
    </div>
  );
}

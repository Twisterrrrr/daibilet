'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { CityCard } from '@/components/CityCard';
import {
  isPopularRailMoscow,
  isPopularRailSpb,
} from '@/lib/popular-cities-rail';
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
 * Full-bleed infinite city cards: left+right peeks from the loop; MSK+SPB centered on load.
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

  const jumpToFocus = useCallback(() => {
    const el = scrollerRef.current;
    if (!el || cities.length === 0) return;
    const setWidth = el.scrollWidth / LOOP_COPIES;
    if (setWidth < 1) return;

    const items = el.querySelectorAll<HTMLElement>('[data-rail-item]');
    const base = cities.length; // middle loop copy
    const focusInSet = [cities.findIndex(isPopularRailMoscow), cities.findIndex(isPopularRailSpb)]
      .filter((index) => index >= 0)
      .sort((a, b) => a - b);

    loopingRef.current = true;

    if (focusInSet.length === 0 || items.length < base + focusInSet[focusInSet.length - 1] + 1) {
      // Fallback: modest left overhang from the previous loop copy.
      const peek = Math.min(measureStep(el) * 0.44, 90);
      el.scrollLeft = setWidth - peek;
    } else {
      const first = items[base + focusInSet[0]];
      const last = items[base + focusInSet[focusInSet.length - 1]];
      const elRect = el.getBoundingClientRect();
      const firstRect = first.getBoundingClientRect();
      const lastRect = last.getBoundingClientRect();
      // Midpoint of MSK+SPB (or whichever focus cards exist) in scroll content coords.
      const focusCenter =
        (firstRect.left + lastRect.right) / 2 - elRect.left + el.scrollLeft;
      el.scrollLeft = Math.max(0, focusCenter - el.clientWidth / 2);
    }

    loopingRef.current = false;
    setReady(true);
  }, [cities]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    jumpToFocus();

    const onScroll = () => {
      if (loopingRef.current) return;
      normalizeLoop();
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', jumpToFocus, { passive: true });

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => jumpToFocus()) : null;
    ro?.observe(el);

    return () => {
      el.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', jumpToFocus);
      ro?.disconnect();
    };
  }, [jumpToFocus, normalizeLoop, loopItems.length]);

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
        className={`home-edge-cities-rail horizontal-snap-row touch-pan-x flex flex-nowrap gap-3 snap-x snap-mandatory pr-4 sm:gap-3.5 sm:pr-6 lg:pr-8 ${HIDE_SCROLLBAR_CLASS} ${
          ready ? 'opacity-100' : 'opacity-0'
        } transition-opacity duration-200`}
        aria-label="Популярные города"
        role="region"
        tabIndex={0}
      >
        {loopItems.map(({ city, key }) => (
          <div
            key={key}
            className="w-[min(68vw,255px)] shrink-0 snap-start sm:w-[218px] lg:w-[229px]"
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

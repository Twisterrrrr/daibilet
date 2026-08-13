'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react';

import { CityCard } from '@/components/CityCard';
import {
  isPopularRailMoscow,
  isPopularRailSpb,
} from '@/lib/popular-cities-rail';
import type { PublicDestinationDto } from '@daibilet/contracts/public';

const LOOP_COPIES = 3;
/** Arrow buttons step several cards so the rail feels purposeful, not one-by-one. */
const ARROW_CARD_STEP = 3;
/** Keep scrollLeft inside this band of one set width (seamless wrap via 3 copies). */
const LOOP_BAND_LO = 0.5;
const LOOP_BAND_HI = 1.5;
/** Finger travel above this cancels city-hub navigation (swipe, not tap). */
const TAP_MOVE_PX = 12;
const HIDE_SCROLLBAR_CLASS =
  '![scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:!hidden';

type RailPointerGesture = {
  id: number;
  x: number;
  y: number;
  moved: boolean;
};

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
 * Left edge of title content (`.container-page` text column) in viewport coords.
 * Rail is full-bleed; MSK should sit under «Популярные города», not mid-viewport.
 */
function measureTitleAnchorLeft(scroller: HTMLElement): number {
  const section = scroller.closest('section');
  const container = section?.querySelector<HTMLElement>('.container-page');
  if (container) {
    const paddingLeft = Number.parseFloat(getComputedStyle(container).paddingLeft) || 0;
    return container.getBoundingClientRect().left + paddingLeft;
  }
  // Mirror .container-page: max-w-7xl + px-4 / sm:px-6 / lg:px-8
  const vw = window.innerWidth;
  const gutter = vw >= 1024 ? 32 : vw >= 640 ? 24 : 16;
  const maxW = 80 * 16;
  return Math.max(gutter, (vw - maxW) / 2 + gutter);
}

/** Align CSS snap port with the H2 gutter so mandatory snap does not fight the MSK anchor. */
function syncScrollPadding(scroller: HTMLElement): number {
  const pad = Math.max(0, Math.round(measureTitleAnchorLeft(scroller) - scroller.getBoundingClientRect().left));
  scroller.style.scrollPaddingLeft = `${pad}px`;
  return pad;
}

/**
 * Instantly re-base scrollLeft into the middle loop band. Same cities stay on screen
 * because copies are identical; without this, arrow scrolls hit maxScrollLeft and snap
 * restore jumps back to the title-anchored start (visible rollback).
 *
 * Must stay bounded: browsers clamp scrollLeft. If layout is not ready
 * (maxScrollLeft << setWidth), `scrollLeft += setWidth` is a no-op and an
 * unbounded while freezes the tab - homepage-only (this rail is only on `/`).
 */
function shiftScrollLeft(el: HTMLElement, delta: number): boolean {
  const before = el.scrollLeft;
  el.scrollLeft = before + delta;
  return el.scrollLeft !== before;
}

function wrapScrollIntoLoopBand(el: HTMLElement, setWidth: number, loopingRef: { current: boolean }) {
  if (!Number.isFinite(setWidth) || setWidth < 1) return;
  loopingRef.current = true;
  const maxSteps = LOOP_COPIES + 2;
  for (let i = 0; i < maxSteps && el.scrollLeft < setWidth * LOOP_BAND_LO; i += 1) {
    if (!shiftScrollLeft(el, setWidth)) break;
  }
  for (let i = 0; i < maxSteps && el.scrollLeft > setWidth * LOOP_BAND_HI; i += 1) {
    if (!shiftScrollLeft(el, -setWidth)) break;
  }
  loopingRef.current = false;
}

/**
 * Full-bleed infinite city cards. On load/resize: Moscow left-aligned under the H2
 * (SPB immediately after); secondary cities may slight-peek left of the gutter.
 */
export function HomePopularCitiesRail({ cities, className = '' }: HomePopularCitiesRailProps) {
  const router = useRouter();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const loopingRef = useRef(false);
  const programScrollRef = useRef(false);
  /** True while a finger/pen is down - skip loop wrap so scroll jumps do not cancel the tap. */
  const interactingRef = useRef(false);
  const gestureRef = useRef<RailPointerGesture | null>(null);
  /** Survives pointerup until click so a swipe does not activate the city Link. */
  const swipeConsumedClickRef = useRef(false);
  /** After touch tap we router.push ourselves; suppress the trailing click to avoid double nav. */
  const suppressClickRef = useRef(false);
  const lastWidthRef = useRef(0);
  const scrollEndTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  const normalizeLoop = useCallback(
    (opts?: { force?: boolean }) => {
      const el = scrollerRef.current;
      if (!el || cities.length < 2 || loopingRef.current) return;
      // During arrow glide, skip passive scroll normalize (would abort smooth scroll).
      // finish/pre-shift call with force while snap is still off.
      if (programScrollRef.current && !opts?.force) return;
      const setWidth = el.scrollWidth / LOOP_COPIES;
      wrapScrollIntoLoopBand(el, setWidth, loopingRef);
    },
    [cities.length],
  );

  const jumpToFocus = useCallback(() => {
    const el = scrollerRef.current;
    if (!el || cities.length === 0 || programScrollRef.current) return;
    const setWidth = el.scrollWidth / LOOP_COPIES;
    if (setWidth < 1) return;

    syncScrollPadding(el);

    const items = el.querySelectorAll<HTMLElement>('[data-rail-item]');
    const base = cities.length; // middle loop copy
    const moscowIdx = cities.findIndex(isPopularRailMoscow);
    const spbIdx = cities.findIndex(isPopularRailSpb);
    // Anchor card = Moscow when present, else SPB, else first card of the set.
    const anchorInSet = moscowIdx >= 0 ? moscowIdx : spbIdx >= 0 ? spbIdx : 0;

    loopingRef.current = true;

    if (items.length < base + anchorInSet + 1) {
      const peek = Math.min(measureStep(el) * 0.44, 90);
      el.scrollLeft = setWidth - peek;
    } else {
      const anchor = items[base + anchorInSet];
      const anchorLeft = measureTitleAnchorLeft(el);
      // Put Moscow (or fallback) flush under the title column; left loop peeks stay in the gutter.
      el.scrollLeft += anchor.getBoundingClientRect().left - anchorLeft;
    }

    loopingRef.current = false;
    setReady(true);
  }, [cities]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    lastWidthRef.current = el.clientWidth;
    jumpToFocus();

    const onScroll = () => {
      // Mid-gesture wrap jumps scrollLeft under the finger and iOS/Android cancel the click.
      if (loopingRef.current || programScrollRef.current || interactingRef.current) return;
      normalizeLoop();
    };

    const onResize = () => {
      lastWidthRef.current = el.clientWidth;
      jumpToFocus();
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });

    // Re-anchor only on width changes. Height-only RO (images/fonts) used to call
    // jumpToFocus mid-interaction and rubber-band the rail back to MSK.
    const ro =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver((entries) => {
            const width = entries[0]?.contentRect.width ?? el.clientWidth;
            if (Math.abs(width - lastWidthRef.current) < 1) return;
            lastWidthRef.current = width;
            jumpToFocus();
          })
        : null;
    ro?.observe(el);

    return () => {
      el.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      ro?.disconnect();
      if (scrollEndTimerRef.current) clearTimeout(scrollEndTimerRef.current);
    };
  }, [jumpToFocus, normalizeLoop, loopItems.length]);

  const finishProgramScroll = useCallback(() => {
    const el = scrollerRef.current;
    if (!programScrollRef.current) return;
    if (scrollEndTimerRef.current) {
      clearTimeout(scrollEndTimerRef.current);
      scrollEndTimerRef.current = null;
    }
    if (el) {
      // Wrap while snap is still none. Restoring snap first (ea6c7897) let
      // snap-mandatory + scroll-padding re-anchor to MSK = rollback at last city.
      normalizeLoop({ force: true });
      el.style.scrollSnapType = '';
    }
    programScrollRef.current = false;
  }, [normalizeLoop]);

  const scrollByDir = (dir: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;

    syncScrollPadding(el);
    const step = measureStep(el) * ARROW_CARD_STEP;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Mandatory snap + smooth scrollBy fought the title-anchored offset (rubber band).
    // Disable snap for the programmatic glide, then restore on scrollend.
    if (scrollEndTimerRef.current) clearTimeout(scrollEndTimerRef.current);
    programScrollRef.current = true;
    el.style.scrollSnapType = 'none';

    // Pre-shift into the loop band (and leave room for this step) so the glide
    // never clamps at maxScrollLeft / 0 - that clamp + snap looked like a rollback.
    const setWidth = el.scrollWidth / LOOP_COPIES;
    if (Number.isFinite(setWidth) && setWidth >= 1 && cities.length >= 2) {
      wrapScrollIntoLoopBand(el, setWidth, loopingRef);
      if (dir === 1 && el.scrollLeft + step > setWidth * LOOP_BAND_HI) {
        shiftScrollLeft(el, -setWidth);
      } else if (dir === -1 && el.scrollLeft - step < setWidth * LOOP_BAND_LO) {
        shiftScrollLeft(el, setWidth);
      }
    }

    const target = el.scrollLeft + dir * step;

    const onScrollEnd = () => {
      el.removeEventListener('scrollend', onScrollEnd);
      finishProgramScroll();
    };

    // Prefer scrollend; long safety timer only. Without scrollend, timed restore.
    const supportsScrollEnd = typeof window !== 'undefined' && 'onscrollend' in window;
    if (supportsScrollEnd) {
      el.addEventListener('scrollend', onScrollEnd);
      scrollEndTimerRef.current = setTimeout(() => {
        el.removeEventListener('scrollend', onScrollEnd);
        finishProgramScroll();
      }, 1200);
    } else {
      scrollEndTimerRef.current = setTimeout(finishProgramScroll, reduceMotion ? 32 : 480);
    }

    el.scrollTo({
      left: target,
      behavior: reduceMotion ? 'auto' : 'smooth',
    });
  };

  const endGesture = useCallback(
    (opts?: { normalize?: boolean }) => {
      interactingRef.current = false;
      gestureRef.current = null;
      if (opts?.normalize === false) return;
      // Wrap only after the finger lifts so a tap can still produce navigation.
      requestAnimationFrame(() => {
        if (!interactingRef.current) normalizeLoop();
      });
    },
    [normalizeLoop],
  );

  const onRailPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    interactingRef.current = true;
    swipeConsumedClickRef.current = false;
    gestureRef.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      moved: false,
    };
  };

  const onRailPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const gesture = gestureRef.current;
    if (!gesture || gesture.id !== event.pointerId || gesture.moved) return;
    const dx = event.clientX - gesture.x;
    const dy = event.clientY - gesture.y;
    if (dx * dx + dy * dy > TAP_MOVE_PX * TAP_MOVE_PX) {
      gesture.moved = true;
      swipeConsumedClickRef.current = true;
    }
  };

  const onRailPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const gesture = gestureRef.current;
    if (!gesture || gesture.id !== event.pointerId) {
      endGesture();
      return;
    }

    const moved = gesture.moved;
    const isTouchLike = event.pointerType === 'touch' || event.pointerType === 'pen';
    endGesture();

    // Desktop mouse keeps native <Link> click. Touch/pen often loses click inside
    // overflow-x + snap rails (micro-scroll or deferred loop wrap); push hub explicitly.
    if (moved || !isTouchLike) return;

    const target = event.target;
    if (!(target instanceof Element)) return;
    // Nested hub-tag chips below the photo use their own href - leave them alone.
    if (target.closest('ul[aria-label^="Популярные направления"]')) return;

    const item = target.closest<HTMLElement>('[data-rail-item]');
    if (!item || !scrollerRef.current?.contains(item)) return;
    const anchor = item.querySelector<HTMLAnchorElement>('a[href^="/cities/"]');
    const href = anchor?.getAttribute('href');
    if (!href) return;

    suppressClickRef.current = true;
    router.push(href);
  };

  const onRailClickCapture = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if (swipeConsumedClickRef.current) {
      swipeConsumedClickRef.current = false;
      event.preventDefault();
      event.stopPropagation();
    }
  };

  if (!cities.length) return null;

  const arrowBase =
    'absolute z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200/90 bg-white/95 text-slate-700 shadow-md backdrop-blur transition-[opacity,transform,colors] hover:bg-white hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2 md:inline-flex top-[33%]';

  return (
    <div className={`relative min-w-0 ${className}`.trim()}>
      <div
        ref={scrollerRef}
        className={`home-edge-cities-rail horizontal-snap-row flex flex-nowrap gap-3 snap-x snap-mandatory pr-4 sm:gap-3.5 sm:pr-6 lg:pr-8 ${HIDE_SCROLLBAR_CLASS} ${
          ready ? 'opacity-100' : 'opacity-0'
        } transition-opacity duration-200`}
        aria-label="Популярные города"
        role="region"
        tabIndex={0}
        onPointerDown={onRailPointerDown}
        onPointerMove={onRailPointerMove}
        onPointerUp={onRailPointerUp}
        onPointerCancel={() => endGesture()}
        onClickCapture={onRailClickCapture}
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

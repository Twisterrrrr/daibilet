'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const EDGE_EPS = 4;

function measureStep(scroller: HTMLElement, cardSelector: string): number {
  const card = scroller.querySelector<HTMLElement>(cardSelector);
  if (card) {
    const gapRaw = getComputedStyle(scroller).gap || getComputedStyle(scroller).columnGap || '0';
    const gap = Number.parseFloat(gapRaw) || 0;
    return Math.max(160, Math.round(card.getBoundingClientRect().width + gap));
  }
  return Math.max(240, Math.round(scroller.clientWidth * 0.85));
}

function readRailState(el: HTMLElement) {
  const { scrollLeft, scrollWidth, clientWidth } = el;
  const hasOverflow = scrollWidth > clientWidth + EDGE_EPS;
  return {
    hasOverflow,
    canPrev: hasOverflow && scrollLeft > EDGE_EPS,
    canNext: hasOverflow && scrollLeft + clientWidth < scrollWidth - EDGE_EPS,
  };
}

/**
 * Horizontal hub card rails (identity / lifehacks): scrollLeft-based arrows.
 * Avoid scrollIntoView + index - smooth scroll lagged and left prev stayed muted.
 */
export function useHubCardRail(cardSelector: string, resetKey: string | number = '') {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const syncRail = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const next = readRailState(el);
    setCanPrev(next.canPrev);
    setCanNext(next.canNext);
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollLeft = 0;
    syncRail();
    el.addEventListener('scroll', syncRail, { passive: true });
    el.addEventListener('scrollend', syncRail);
    window.addEventListener('resize', syncRail, { passive: true });
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(syncRail) : null;
    ro?.observe(el);
    return () => {
      el.removeEventListener('scroll', syncRail);
      el.removeEventListener('scrollend', syncRail);
      window.removeEventListener('resize', syncRail);
      ro?.disconnect();
    };
  }, [syncRail, resetKey]);

  const scrollByDir = useCallback(
    (dir: -1 | 1) => {
      const el = scrollerRef.current;
      if (!el) return;
      const state = readRailState(el);
      if (dir < 0 && !state.canPrev) return;
      if (dir > 0 && !state.canNext) return;

      if (dir > 0) setCanPrev(true);
      if (dir < 0) setCanNext(true);

      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      el.scrollBy({
        left: dir * measureStep(el, cardSelector),
        behavior: reduceMotion ? 'auto' : 'smooth',
      });
      requestAnimationFrame(() => {
        syncRail();
        requestAnimationFrame(syncRail);
      });
    },
    [cardSelector, syncRail],
  );

  return {
    scrollerRef,
    canPrev,
    canNext,
    onPrev: () => scrollByDir(-1),
    onNext: () => scrollByDir(1),
  };
}

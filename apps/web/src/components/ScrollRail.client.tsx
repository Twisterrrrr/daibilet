'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';

type ScrollRailProps = {
  children: ReactNode;
  className?: string;
  /** Extra classes on the scroll viewport (merged with horizontal-snap-row). */
  viewportClassName?: string;
  style?: CSSProperties;
  'aria-label'?: string;
};

const EDGE_EPS = 4;

function measureStep(scroller: HTMLElement): number {
  const card =
    scroller.querySelector<HTMLElement>('.showcase-rail-card, .horizontal-snap-card, [data-rail-item]') ||
    scroller.querySelector<HTMLElement>(':scope > * > *') ||
    scroller.querySelector<HTMLElement>(':scope > *');

  if (card) {
    const track = card.parentElement;
    const gapRaw = track ? getComputedStyle(track).gap || getComputedStyle(track).columnGap : '0';
    const gap = Number.parseFloat(gapRaw) || 0;
    return Math.max(160, Math.round(card.getBoundingClientRect().width + gap));
  }

  return Math.max(240, Math.round(scroller.clientWidth * 0.85));
}

/**
 * Horizontal row with md+ prev/next controls when content overflows.
 * Mobile keeps swipe + thin scrollbar from `.horizontal-snap-row`.
 */
export function ScrollRail({
  children,
  className = '',
  viewportClassName = '',
  style,
  'aria-label': ariaLabel = 'Горизонтальный список',
}: ScrollRailProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const update = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const overflow = scrollWidth > clientWidth + EDGE_EPS;
    setCanPrev(overflow && scrollLeft > EDGE_EPS);
    setCanNext(overflow && scrollLeft + clientWidth < scrollWidth - EDGE_EPS);
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    update();
    el.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update, { passive: true });

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
    ro?.observe(el);

    const mo =
      typeof MutationObserver !== 'undefined'
        ? new MutationObserver(() => {
            requestAnimationFrame(update);
          })
        : null;
    mo?.observe(el, { childList: true, subtree: true });

    return () => {
      el.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      ro?.disconnect();
      mo?.disconnect();
    };
  }, [update, children]);

  const scrollByDir = (dir: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollBy({
      left: dir * measureStep(el),
      behavior: reduceMotion ? 'auto' : 'smooth',
    });
  };

  const showControls = canPrev || canNext;

  return (
    <div className={`relative min-w-0 ${className}`.trim()} style={style}>
      <div
        ref={scrollerRef}
        className={`horizontal-snap-row touch-pan-x ${viewportClassName}`.trim()}
        aria-label={ariaLabel}
        role="region"
        tabIndex={0}
      >
        {children}
      </div>

      {showControls ? (
        <>
          <button
            type="button"
            aria-label="Прокрутить влево"
            aria-disabled={!canPrev}
            tabIndex={canPrev ? 0 : -1}
            disabled={!canPrev}
            onClick={() => scrollByDir(-1)}
            className={`absolute left-1 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200/90 bg-white/95 text-slate-700 shadow-md backdrop-blur transition-[opacity,transform,colors] hover:bg-white hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2 md:inline-flex ${
              canPrev ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
            }`}
          >
            <ChevronLeft className="h-5 w-5" aria-hidden />
          </button>
          <button
            type="button"
            aria-label="Прокрутить вправо"
            aria-disabled={!canNext}
            tabIndex={canNext ? 0 : -1}
            disabled={!canNext}
            onClick={() => scrollByDir(1)}
            className={`absolute right-1 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200/90 bg-white/95 text-slate-700 shadow-md backdrop-blur transition-[opacity,transform,colors] hover:bg-white hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2 md:inline-flex ${
              canNext ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
            }`}
          >
            <ChevronRight className="h-5 w-5" aria-hidden />
          </button>
        </>
      ) : null}
    </div>
  );
}

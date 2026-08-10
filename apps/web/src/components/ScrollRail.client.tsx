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
  /** Hide native scrollbar (keep swipe + md arrows). */
  hideScrollbar?: boolean;
  style?: CSSProperties;
  'aria-label'?: string;
};

const EDGE_EPS = 4;
const HIDE_SCROLLBAR_CLASS =
  '![scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:!hidden';

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
 * Mobile keeps swipe; optional hideScrollbar (city hub rail).
 * Both arrows stay visible while overflowing (edge buttons muted/disabled).
 * Arrow Y sits in the photo band (~1/3), not over bottom card titles.
 */
export function ScrollRail({
  children,
  className = '',
  viewportClassName = '',
  hideScrollbar = false,
  style,
  'aria-label': ariaLabel = 'Горизонтальный список',
}: ScrollRailProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = useState(false);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const update = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const hasOverflow = scrollWidth > clientWidth + EDGE_EPS;
    setOverflow(hasOverflow);
    setCanPrev(hasOverflow && scrollLeft > EDGE_EPS);
    setCanNext(hasOverflow && scrollLeft + clientWidth < scrollWidth - EDGE_EPS);
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

  const arrowBase =
    'absolute z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200/90 bg-white/95 text-slate-700 shadow-md backdrop-blur transition-[opacity,transform,colors] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2 md:inline-flex top-[33%]';

  return (
    <div className={`relative min-w-0 overflow-visible ${className}`.trim()} style={style}>
      <div
        ref={scrollerRef}
        className={`horizontal-snap-row touch-pan-x ${hideScrollbar ? HIDE_SCROLLBAR_CLASS : ''} ${viewportClassName}`.trim()}
        aria-label={ariaLabel}
        role="region"
        tabIndex={0}
      >
        {children}
      </div>

      {overflow ? (
        <>
          <button
            type="button"
            aria-label="Прокрутить влево"
            aria-disabled={!canPrev}
            tabIndex={canPrev ? 0 : -1}
            disabled={!canPrev}
            onClick={() => scrollByDir(-1)}
            className={`${arrowBase} left-3 ${
              canPrev
                ? 'pointer-events-auto opacity-100 hover:bg-white hover:text-slate-950'
                : 'pointer-events-none opacity-40'
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
            className={`${arrowBase} right-3 ${
              canNext
                ? 'pointer-events-auto opacity-100 hover:bg-white hover:text-slate-950'
                : 'pointer-events-none opacity-40'
            }`}
          >
            <ChevronRight className="h-5 w-5" aria-hidden />
          </button>
        </>
      ) : null}
    </div>
  );
}

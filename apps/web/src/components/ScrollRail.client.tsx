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
  /**
   * `photo` = overlay arrows over card image band.
   * `center` = hub-style discs outside the track (beside the content column).
   */
  arrowAlign?: 'photo' | 'center';
  /**
   * Only for `photo` overlay. Hub-outside (`center`) always uses white discs
   * like city hub `HubCarouselChrome`.
   */
  arrowTone?: 'light' | 'dark';
  /** Soft edge fade when content overflows (hints more chips). */
  edgeFade?: boolean;
  style?: CSSProperties;
  'aria-label'?: string;
};

const EDGE_EPS = 4;
const HIDE_SCROLLBAR_CLASS =
  '![scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:!hidden';

/** Same discs as HubCarouselChrome (city hub). */
const HUB_OUTSIDE_ARROW =
  'inline-btn absolute top-1/2 z-20 hidden size-10 shrink-0 aspect-square min-h-0 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white p-0 text-slate-700 shadow-sm transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-40 md:inline-flex';

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
 * `center` = hub discs outside the rail; `photo` = overlay on the image band.
 */
export function ScrollRail({
  children,
  className = '',
  viewportClassName = '',
  hideScrollbar = false,
  arrowAlign = 'photo',
  arrowTone = 'dark',
  edgeFade = false,
  style,
  'aria-label': ariaLabel = 'Горизонтальный список',
}: ScrollRailProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = useState(false);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);
  const arrowsOutside = arrowAlign === 'center';

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

  const overlayToneCls =
    arrowTone === 'light'
      ? 'border-white/40 bg-white/25 text-white shadow-sm backdrop-blur-sm hover:bg-white/40 focus-visible:ring-white/50'
      : 'border-slate-200/90 bg-white/95 text-slate-700 shadow-md backdrop-blur hover:bg-white hover:text-slate-950 focus-visible:ring-slate-300 focus-visible:ring-offset-2';
  const overlayArrowBase = `inline-btn absolute z-10 top-[33%] hidden h-10 w-10 min-h-0 -translate-y-1/2 items-center justify-center rounded-full border p-0 transition-[opacity,transform,colors] focus-visible:outline-none focus-visible:ring-2 md:inline-flex ${overlayToneCls}`;

  const fadePad = arrowsOutside ? '0.35rem' : '1.25rem';
  const fadeMask =
    edgeFade && overflow
      ? {
          maskImage: `linear-gradient(90deg, ${canPrev ? `transparent, black ${fadePad}` : 'black'}, ${
            canNext ? `black calc(100% - ${fadePad}), transparent` : 'black'
          })`,
          WebkitMaskImage: `linear-gradient(90deg, ${canPrev ? `transparent, black ${fadePad}` : 'black'}, ${
            canNext ? `black calc(100% - ${fadePad}), transparent` : 'black'
          })`,
        }
      : undefined;

  const prevBtn = overflow ? (
    <button
      type="button"
      aria-label="Прокрутить влево"
      aria-disabled={!canPrev}
      tabIndex={canPrev ? 0 : -1}
      disabled={!canPrev}
      onClick={() => scrollByDir(-1)}
      className={
        arrowsOutside
          ? `${HUB_OUTSIDE_ARROW} left-0 -translate-x-[calc(100%+0.75rem)]`
          : `${overlayArrowBase} left-3 ${
              canPrev ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-35'
            }`
      }
    >
      <ChevronLeft className="h-5 w-5" aria-hidden />
    </button>
  ) : null;

  const nextBtn = overflow ? (
    <button
      type="button"
      aria-label="Прокрутить вправо"
      aria-disabled={!canNext}
      tabIndex={canNext ? 0 : -1}
      disabled={!canNext}
      onClick={() => scrollByDir(1)}
      className={
        arrowsOutside
          ? `${HUB_OUTSIDE_ARROW} right-0 translate-x-[calc(100%+0.75rem)]`
          : `${overlayArrowBase} right-3 ${
              canNext ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-35'
            }`
      }
    >
      <ChevronRight className="h-5 w-5" aria-hidden />
    </button>
  ) : null;

  const viewport = (
    <div
      ref={scrollerRef}
      className={`horizontal-snap-row min-w-0 flex-1 ${hideScrollbar ? HIDE_SCROLLBAR_CLASS : ''} ${viewportClassName}`.trim()}
      style={fadeMask}
      aria-label={ariaLabel}
      role="region"
      tabIndex={0}
    >
      {children}
    </div>
  );

  if (arrowsOutside) {
    return (
      <div className={`relative min-w-0 overflow-visible ${className}`.trim()} style={style}>
        {prevBtn}
        {viewport}
        {nextBtn}
      </div>
    );
  }

  return (
    <div className={`relative min-w-0 overflow-visible ${className}`.trim()} style={style}>
      {viewport}
      {prevBtn}
      {nextBtn}
    </div>
  );
}

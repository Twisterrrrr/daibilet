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
  /** `photo` = over card image band; `center` = mid rail (chips / thin rows). */
  arrowAlign?: 'photo' | 'center';
  /** `light` = white glass for dark heroes; default slate for light pages. */
  arrowTone?: 'light' | 'dark';
  /** Soft edge fade when content overflows (hints more chips). */
  edgeFade?: boolean;
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

  const arrowY = arrowAlign === 'center' ? 'top-1/2' : 'top-[33%]';
  /** Hero chips: compact; editorial cards keep larger hit target. */
  const arrowSize = arrowAlign === 'center' ? 'h-7 w-7' : 'h-10 w-10';
  const iconSize = arrowAlign === 'center' ? 'h-3.5 w-3.5' : 'h-5 w-5';
  const arrowInset = 'left-3';
  const arrowInsetRight = 'right-3';
  const arrowToneCls =
    arrowTone === 'light'
      ? 'border-white/40 bg-white/25 text-white shadow-sm backdrop-blur-sm hover:bg-white/40 focus-visible:ring-white/50'
      : 'border-slate-200/90 bg-white/95 text-slate-700 shadow-md backdrop-blur hover:bg-white hover:text-slate-950 focus-visible:ring-slate-300 focus-visible:ring-offset-2';
  // md+ only - mobile keeps swipe (no arrows).
  const arrowBase = `absolute z-10 hidden ${arrowSize} -translate-y-1/2 items-center justify-center rounded-full border transition-[opacity,transform,colors] focus-visible:outline-none focus-visible:ring-2 md:inline-flex ${arrowY} ${arrowToneCls}`;

  const fadePad = arrowAlign === 'center' ? '0.85rem' : '1.25rem';
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

  return (
    <div className={`relative min-w-0 overflow-visible ${className}`.trim()} style={style}>
      <div
        ref={scrollerRef}
        className={`horizontal-snap-row touch-pan-x ${hideScrollbar ? HIDE_SCROLLBAR_CLASS : ''} ${viewportClassName}`.trim()}
        style={fadeMask}
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
            className={`${arrowBase} ${arrowInset} ${
              canPrev ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-40'
            }`}
          >
            <ChevronLeft className={iconSize} aria-hidden />
          </button>
          <button
            type="button"
            aria-label="Прокрутить вправо"
            aria-disabled={!canNext}
            tabIndex={canNext ? 0 : -1}
            disabled={!canNext}
            onClick={() => scrollByDir(1)}
            className={`${arrowBase} ${arrowInsetRight} ${
              canNext ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-40'
            }`}
          >
            <ChevronRight className={iconSize} aria-hidden />
          </button>
        </>
      ) : null}
    </div>
  );
}

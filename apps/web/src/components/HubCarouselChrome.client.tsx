'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { HTMLAttributes, ReactNode, Ref } from 'react';

// inline-btn / min-h-0: defeat globals.css button min-height:44px (oval discs).
// Avoid native `disabled` - some browsers keep muted hit-testing after re-enable mid-scroll.
const ARROW_BASE =
  'inline-btn absolute top-1/2 z-20 hidden size-10 shrink-0 aspect-square min-h-0 items-center justify-center rounded-full border border-slate-200 bg-white p-0 text-slate-700 shadow-sm transition-[opacity,transform,colors] hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-1 md:inline-flex';

type HubCarouselChromeProps = {
  children: ReactNode;
  /** Scrollport / track node (forwarded to the inner region). */
  scrollerRef?: Ref<HTMLDivElement>;
  className?: string;
  trackClassName?: string;
  trackProps?: HTMLAttributes<HTMLDivElement>;
  'aria-label'?: string;
  showArrows?: boolean;
  canPrev?: boolean;
  canNext?: boolean;
  onPrev?: () => void;
  onNext?: () => void;
  prevLabel?: string;
  nextLabel?: string;
  prevDataAttr?: string;
  nextDataAttr?: string;
  tabIndex?: number;
};

/**
 * Hub card carousels: md+ prev/next float beside the track (outside the title band
 * and outside the content column edge). Mobile keeps swipe only.
 */
export function HubCarouselChrome({
  children,
  scrollerRef,
  className = '',
  trackClassName = '',
  trackProps,
  'aria-label': ariaLabel,
  showArrows = true,
  canPrev = true,
  canNext = true,
  onPrev,
  onNext,
  prevLabel = 'Прокрутить влево',
  nextLabel = 'Прокрутить вправо',
  prevDataAttr,
  nextDataAttr,
  tabIndex,
}: HubCarouselChromeProps) {
  const prevAttrs = prevDataAttr ? { [prevDataAttr]: '' } : undefined;
  const nextAttrs = nextDataAttr ? { [nextDataAttr]: '' } : undefined;
  const muted = 'pointer-events-none opacity-40';
  const live = 'pointer-events-auto opacity-100';

  return (
    <div className={`relative overflow-visible ${className}`.trim()}>
      {showArrows ? (
        <button
          type="button"
          aria-label={prevLabel}
          aria-disabled={!canPrev}
          tabIndex={canPrev ? 0 : -1}
          onClick={canPrev ? onPrev : undefined}
          className={`${ARROW_BASE} left-0 -translate-x-[calc(100%+0.75rem)] -translate-y-1/2 ${
            canPrev ? live : muted
          }`}
          {...prevAttrs}
        >
          <ChevronLeft className="h-5 w-5" aria-hidden />
        </button>
      ) : null}
      <div
        ref={scrollerRef}
        className={`min-w-0 ${trackClassName}`.trim()}
        aria-label={ariaLabel}
        role={ariaLabel ? 'region' : undefined}
        tabIndex={tabIndex}
        {...trackProps}
      >
        {children}
      </div>
      {showArrows ? (
        <button
          type="button"
          aria-label={nextLabel}
          aria-disabled={!canNext}
          tabIndex={canNext ? 0 : -1}
          onClick={canNext ? onNext : undefined}
          className={`${ARROW_BASE} right-0 translate-x-[calc(100%+0.75rem)] -translate-y-1/2 ${
            canNext ? live : muted
          }`}
          {...nextAttrs}
        >
          <ChevronRight className="h-5 w-5" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}

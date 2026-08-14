'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { HTMLAttributes, ReactNode, Ref } from 'react';

const ARROW_BASE =
  'absolute top-1/2 z-20 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-40 md:inline-flex';

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

  return (
    <div className={`relative overflow-visible ${className}`.trim()}>
      {showArrows ? (
        <button
          type="button"
          aria-label={prevLabel}
          disabled={!canPrev}
          onClick={onPrev}
          className={`${ARROW_BASE} left-0 -translate-x-[calc(100%+0.75rem)]`}
          {...prevAttrs}
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
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
          disabled={!canNext}
          onClick={onNext}
          className={`${ARROW_BASE} right-0 translate-x-[calc(100%+0.75rem)]`}
          {...nextAttrs}
        >
          <ChevronRight className="h-4 w-4" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}

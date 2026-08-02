'use client';

import * as React from 'react';

type Props = {
  text: string;
  className?: string;
  /** Tailwind line-clamp class while collapsed. */
  clampClassName?: string;
  moreLabel?: string;
  lessLabel?: string;
  buttonClassName?: string;
};

/**
 * 2-line (or N-line) blurb with «ещё» / «свернуть» when text overflows the clamp.
 * Avoids dead-end «…» with nowhere to finish reading.
 */
export function ExpandableBlurb({
  text,
  className = '',
  clampClassName = 'line-clamp-2',
  moreLabel = 'ещё',
  lessLabel = 'свернуть',
  buttonClassName = 'mt-0.5 text-xs font-semibold text-slate-700 underline-offset-2 hover:underline',
}: Props) {
  const body = String(text || '').trim();
  const ref = React.useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = React.useState(false);
  const [overflows, setOverflows] = React.useState(false);

  React.useLayoutEffect(() => {
    setExpanded(false);
  }, [body]);

  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !body) {
      setOverflows(false);
      return;
    }
    if (expanded) return;

    const measure = () => {
      setOverflows(el.scrollHeight > el.clientHeight + 1);
    };
    measure();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, [body, expanded, clampClassName]);

  if (!body) return null;

  return (
    <div className="min-w-0">
      <p ref={ref} className={`${className} ${expanded ? '' : clampClassName}`.trim()}>
        {body}
      </p>
      {overflows || expanded ? (
        <button
          type="button"
          className={buttonClassName}
          aria-expanded={expanded}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setExpanded((cur) => !cur);
          }}
        >
          {expanded ? lessLabel : moreLabel}
        </button>
      ) : null}
    </div>
  );
}

'use client';

import {
  Children,
  cloneElement,
  isValidElement,
  useId,
  type ReactElement,
  type ReactNode,
} from 'react';

type TriggerProps = {
  title?: string;
  'aria-describedby'?: string;
};

type Props = {
  hint: string;
  children: ReactNode;
  className?: string;
};

/**
 * Desktop: CSS hover/focus tooltip. Mobile (no hover): compact subtitle.
 * Reuses native `title` + aria-describedby; no extra DS tooltip.
 */
export function CollectRouteCtaHint({ hint, children, className = '' }: Props) {
  const hintId = useId();
  const child = Children.toArray(children).find((node) => isValidElement(node));
  const prev = isValidElement(child) ? (child.props as TriggerProps) : null;
  const trigger =
    isValidElement(child)
      ? cloneElement(child as ReactElement<TriggerProps>, {
          title: prev?.title || hint,
          'aria-describedby': [prev?.['aria-describedby'], hintId].filter(Boolean).join(' '),
        })
      : children;

  return (
    <div className={`group relative inline-flex max-w-full flex-col ${className}`.trim()}>
      {trigger}
      <span
        id={hintId}
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-40 mb-1.5 hidden w-[min(18rem,calc(100vw-2rem))] -translate-x-1/2 rounded-lg bg-slate-900 px-3 py-2 text-left text-[11px] font-medium leading-snug text-white shadow-lg [@media(hover:hover)]:group-hover:block [@media(hover:hover)]:group-focus-within:block"
      >
        {hint}
      </span>
      <p
        className="mt-1 max-w-[18rem] text-[11px] font-medium leading-snug text-slate-500 [@media(hover:hover)]:hidden"
        data-collect-route-hint
      >
        {hint}
      </p>
    </div>
  );
}

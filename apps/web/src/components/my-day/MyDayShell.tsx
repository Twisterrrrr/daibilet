'use client';

import { useRef, type ReactNode } from 'react';

import { MyDayResizeHandle } from '@/components/my-day/MyDayResizeHandle';
import { usePersistedNumber } from '@/components/my-day/usePersistedNumber';

const LIST_SPLIT_KEY = 'daibilet.my-day.list-split';
/** Keep the itinerary readable; the map remains resizable once there are stops. */
const LIST_SPLIT_DEFAULT = 38;
const LIST_SPLIT_MIN = 28;
const LIST_SPLIT_MAX = 50;

type MyDayShellProps = {
  mapOpen: boolean;
  list: ReactNode;
  map: ReactNode;
  /** When false, map column hidden on lg (no coords). */
  showMapColumn?: boolean;
  className?: string;
  listSplitKey?: string;
  listSplitDefault?: number;
};

/**
 * Desktop split: list column + sticky map.
 * When map is open, the divider can be dragged; width is remembered.
 */
export function MyDayShell({
  mapOpen,
  list,
  map,
  showMapColumn = true,
  className = '',
  listSplitKey = LIST_SPLIT_KEY,
  listSplitDefault = LIST_SPLIT_DEFAULT,
}: MyDayShellProps) {
  const shellRef = useRef<HTMLDivElement | null>(null);
  const [listPct, setListPct] = usePersistedNumber(listSplitKey, listSplitDefault);
  const effectiveListPct = Math.min(LIST_SPLIT_MAX, Math.max(LIST_SPLIT_MIN, listPct));
  const splitOn = showMapColumn && mapOpen;
  const gridClass = !showMapColumn
    ? 'lg:grid-cols-1'
    : mapOpen
      ? ''
      : 'lg:grid-cols-[minmax(0,1fr)_56px]';

  return (
    <div
      ref={shellRef}
      className={`flex flex-col gap-4 lg:grid lg:items-stretch lg:gap-0 ${gridClass} ${className}`.trim()}
      style={
        splitOn
          ? {
              gridTemplateColumns: `minmax(22rem, min(${effectiveListPct}vw, 32rem)) minmax(20rem, 1fr)`,
            }
          : undefined
      }
      data-my-day-shell="1"
      data-my-day-map-open={showMapColumn && mapOpen ? '1' : '0'}
      data-my-day-list-split={splitOn ? String(effectiveListPct) : undefined}
    >
      <div className="relative min-h-0 min-w-0 lg:h-full lg:border-r lg:border-slate-200" data-my-day-list-col>
        {list}
        {splitOn ? (
          <MyDayResizeHandle
            label="Ширина списка и карты"
            className="right-0"
            onDrag={(clientX) => {
              const el = shellRef.current;
              if (!el) return;
              const rect = el.getBoundingClientRect();
              if (rect.width < 1) return;
              const next = ((clientX - rect.left) / rect.width) * 100;
              setListPct(Math.min(LIST_SPLIT_MAX, Math.max(LIST_SPLIT_MIN, next)));
            }}
          />
        ) : null}
      </div>
      {showMapColumn ? (
        <aside
          className="relative hidden lg:sticky lg:top-[calc(var(--site-header-height)_+_5rem)] lg:block lg:h-[calc(100dvh_-_var(--site-header-height)_-_5rem)] lg:self-start"
          data-my-day-map-col
        >
          {map}
        </aside>
      ) : null}
    </div>
  );
}

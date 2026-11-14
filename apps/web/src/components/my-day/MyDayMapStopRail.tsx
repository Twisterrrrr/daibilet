'use client';

import { CardSafeImage } from '@/components/SafeImage.client';

export type MyDayMapStopRailItem = {
  id: string;
  title: string;
  imageUrl?: string | null;
  meta?: string | null;
};

type Props = {
  items: MyDayMapStopRailItem[];
  activeId?: string | null;
  onSelect: (id: string) => void;
};

/** Compact route carousel over the map, mirroring the focused stop selection. */
export function MyDayMapStopRail({ items, activeId, onSelect }: Props) {
  if (!items.length) return null;

  return (
    <div
      className="pointer-events-none absolute inset-x-3 bottom-3 z-[450] sm:inset-x-4"
      data-my-day-map-stop-rail
    >
      <div
        className="horizontal-snap-row pointer-events-auto flex snap-x snap-mandatory gap-2 overflow-x-auto overscroll-x-contain pb-1 [scrollbar-width:thin]"
        role="list"
        aria-label="Точки маршрута"
      >
        {items.map((item, index) => {
          const active = activeId === item.id;
          return (
            <button
              key={`${item.id}:${index}`}
              type="button"
              role="listitem"
              onClick={() => onSelect(item.id)}
              aria-current={active ? 'step' : undefined}
              aria-label={`Точка ${index + 1}: ${item.title}`}
              data-my-day-map-stop={item.id}
              className={`flex min-w-[11rem] max-w-[13rem] snap-start items-center gap-2 rounded-2xl border px-2.5 py-2 text-left shadow-md backdrop-blur transition sm:min-w-[12rem] ${
                active
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 bg-white/95 text-slate-900 hover:bg-white'
              }`}
            >
              <span
                className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold tabular-nums ${
                  active ? 'bg-white text-slate-900' : 'bg-slate-100 text-slate-700'
                }`}
              >
                {index + 1}
              </span>
              {item.imageUrl ? (
                <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                  <CardSafeImage src={item.imageUrl} alt="" fill sizes="2.25rem" className="object-cover" />
                </span>
              ) : null}
              <span className="min-w-0">
                <span className="block truncate text-xs font-semibold leading-4">{item.title}</span>
                {item.meta ? (
                  <span className={`mt-0.5 block truncate text-[10px] leading-3 ${active ? 'text-white/65' : 'text-slate-500'}`}>
                    {item.meta}
                  </span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

'use client';

import { cityIdentityTags, focusFromIdentityTag, type CityPlaceFocus } from '@/lib/city-hub-local-flavor';

type Props = {
  citySlug: string;
  activeId?: string | null;
  editorial?: boolean;
  onSelect: (focus: CityPlaceFocus) => void;
};

export function CityIdentityTags({ citySlug, activeId = null, editorial = false, onSelect }: Props) {
  const tags = cityIdentityTags(citySlug);
  if (!tags.length) return null;

  return (
    <div className="mt-5" data-city-identity-tags>
      <p className={`text-xs font-semibold uppercase tracking-wide ${editorial ? 'text-zinc-500' : 'text-slate-500'}`}>
        Локальные теги
      </p>
      <div className="mt-2 flex flex-wrap gap-2" role="list">
        {tags.map((tag) => {
          const active = activeId === tag.id;
          return (
            <button
              key={tag.id}
              type="button"
              role="listitem"
              data-city-identity-tag={tag.id}
              data-active={active ? '1' : '0'}
              aria-pressed={active}
              title={tag.hint}
              onClick={() => onSelect(focusFromIdentityTag(tag))}
              className={`inline-flex min-h-9 items-center rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                active
                  ? editorial
                    ? 'border-zinc-900 bg-zinc-900 text-white'
                    : 'border-slate-900 bg-slate-900 text-white'
                  : editorial
                    ? 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'
              }`}
            >
              {tag.hashtag}
            </button>
          );
        })}
      </div>
    </div>
  );
}

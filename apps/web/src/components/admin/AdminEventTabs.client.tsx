'use client';

import { useEffect, useState, type ReactNode } from 'react';

type Tab = {
  id: string;
  label: string;
  content: ReactNode;
};

/**
 * Event card workbench tabs. All tabs stay mounted so unsaved form input
 * survives switching; the active tab is mirrored into `?tab=` via history
 * API (shallow - no server refetch, forms are not remounted).
 */
export function AdminEventTabs({ tabs }: { tabs: Tab[] }) {
  const [activeId, setActiveId] = useState<string>(() => {
    if (typeof window === 'undefined') return tabs[0].id;
    const search = new URLSearchParams(window.location.search);
    const saved = search.get('saved');
    const requested = search.get('tab') || (saved === 'taxonomy' || saved === 'venue-links' ? 'structure' : saved);
    return tabs.some((tab) => tab.id === requested) ? (requested as string) : tabs[0].id;
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (activeId === tabs[0].id) params.delete('tab');
    else params.set('tab', activeId);
    const qs = params.toString();
    window.history.replaceState(null, '', qs ? `${window.location.pathname}?${qs}` : window.location.pathname);
  }, [activeId, tabs]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Разделы карточки события">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeId === tab.id}
            onClick={() => setActiveId(tab.id)}
            className={`rounded-md border px-3 py-1.5 text-sm ${
              activeId === tab.id
                ? 'border-slate-900 bg-slate-900 text-white'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabs.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          hidden={activeId !== tab.id}
          className={activeId !== tab.id ? 'hidden' : undefined}
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}

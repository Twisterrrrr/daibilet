'use client';

import { SlidersHorizontal, X } from 'lucide-react';
import { useCallback, useEffect, useId, useState, type ReactNode } from 'react';

type CatalogSidebarLayoutProps = {
  sidebar: ReactNode;
  children: ReactNode;
  /** Mobile drawer title */
  title?: string;
  triggerLabel?: string;
  /** Active filter count badge on mobile trigger */
  activeCount?: number;
  onDrawerClose?: () => void;
  /** Called when drawer opens — use to snapshot filter state for reset-on-dismiss */
  onDrawerOpen?: () => void;
  footer?: ReactNode;
};

/**
 * Two-column catalog layout (lg+ sticky sidebar) + mobile slide-in drawer.
 * Single sidebar DOM — no duplicate filter markup.
 */
export function CatalogSidebarLayout({
  sidebar,
  children,
  title = 'Фильтры',
  triggerLabel = 'Фильтры и поиск',
  activeCount = 0,
  onDrawerClose,
  onDrawerOpen,
  footer,
}: CatalogSidebarLayoutProps) {
  const [open, setOpen] = useState(false);
  const titleId = useId();

  const close = useCallback(() => {
    setOpen(false);
    onDrawerClose?.();
  }, [onDrawerClose]);

  const openDrawer = useCallback(() => {
    onDrawerOpen?.();
    setOpen(true);
  }, [onDrawerOpen]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [open, close]);

  return (
    <>
      <button
        type="button"
        className="catalog-mobile-filters-trigger"
        aria-expanded={open}
        aria-controls="catalog-filter-sidebar"
        onClick={openDrawer}
      >
        <SlidersHorizontal className="h-4 w-4" strokeWidth={1.75} aria-hidden />
        {activeCount > 0 ? `${title} (${activeCount})` : triggerLabel}
      </button>

      <div
        className={`catalog-sidebar-overlay${open ? ' is-visible' : ''}`}
        aria-hidden={!open}
        onClick={close}
      />

      <div className="catalog-page-layout">
        <aside
          id="catalog-filter-sidebar"
          className={`catalog-sidebar${open ? ' is-open' : ''}`}
          aria-labelledby={titleId}
        >
          <div className="catalog-sidebar-mobile-header lg:hidden">
            <h2 id={titleId} className="text-base font-bold text-slate-900">
              {title}
            </h2>
            <button
              type="button"
              className="catalog-sidebar-close"
              aria-label="Закрыть фильтры"
              onClick={close}
            >
              <X className="h-5 w-5" strokeWidth={1.75} />
            </button>
          </div>
          {sidebar}
          {footer ? <div className="catalog-sidebar-mobile-footer lg:hidden">{footer}</div> : null}
        </aside>

        <div className="catalog-main min-w-0">{children}</div>
      </div>
    </>
  );
}

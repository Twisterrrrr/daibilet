'use client';

import { ChevronLeft, ChevronRight, SlidersHorizontal, X } from 'lucide-react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useState,
  type ReactNode,
} from 'react';

const FILTERS_COLLAPSED_KEY = 'daibilet.catalog.filters-collapsed';

type CatalogFiltersLayoutContextValue = {
  desktopCollapsed: boolean;
  collapseDesktop: () => void;
  expandDesktop: () => void;
};

const CatalogFiltersLayoutContext = createContext<CatalogFiltersLayoutContextValue | null>(null);

export function useCatalogFiltersLayout() {
  return useContext(CatalogFiltersLayoutContext);
}

/** Desktop header control: collapse sticky filters to free the grid. */
export function CatalogDesktopFiltersCollapseButton() {
  const layout = useCatalogFiltersLayout();
  if (!layout) return null;
  return (
    <button
      type="button"
      className="catalog-sidebar-collapse"
      aria-label="Свернуть фильтры"
      title="Свернуть фильтры"
      onClick={layout.collapseDesktop}
    >
      <ChevronLeft className="h-4 w-4" strokeWidth={1.75} aria-hidden />
    </button>
  );
}

type CatalogSidebarLayoutProps = {
  sidebar: ReactNode;
  children: ReactNode;
  /** Mobile drawer title */
  title?: string;
  triggerLabel?: string;
  /** Active filter count badge on mobile trigger */
  activeCount?: number;
  /** Overlay / X / Escape — rollback draft without applying. */
  onDrawerDismiss?: () => void;
  /** Called when drawer opens — use to snapshot filter state for reset-on-dismiss */
  onDrawerOpen?: () => void;
  footer?:
    | ReactNode
    | ((actions: { closeApply: () => void; closeDismiss: () => void }) => ReactNode);
};

/**
 * Two-column catalog layout (lg+ sticky sidebar) + mobile slide-in drawer.
 * Desktop sidebar can collapse to free the full grid width.
 * Single sidebar DOM — no duplicate filter markup.
 */
export function CatalogSidebarLayout({
  sidebar,
  children,
  title = 'Фильтры',
  triggerLabel = 'Фильтры и поиск',
  activeCount = 0,
  onDrawerDismiss,
  onDrawerOpen,
  footer,
}: CatalogSidebarLayoutProps) {
  const [open, setOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const titleId = useId();

  useEffect(() => {
    try {
      setDesktopCollapsed(window.localStorage.getItem(FILTERS_COLLAPSED_KEY) === '1');
    } catch {
      /* ignore */
    }
  }, []);

  const persistCollapsed = useCallback((next: boolean) => {
    setDesktopCollapsed(next);
    try {
      window.localStorage.setItem(FILTERS_COLLAPSED_KEY, next ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, []);

  const collapseDesktop = useCallback(() => persistCollapsed(true), [persistCollapsed]);
  const expandDesktop = useCallback(() => persistCollapsed(false), [persistCollapsed]);

  const closeDismiss = useCallback(() => {
    setOpen(false);
    onDrawerDismiss?.();
  }, [onDrawerDismiss]);

  const closeApply = useCallback(() => {
    setOpen(false);
  }, []);

  const openDrawer = useCallback(() => {
    onDrawerOpen?.();
    setOpen(true);
  }, [onDrawerOpen]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeDismiss();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [open, closeDismiss]);

  const layoutValue: CatalogFiltersLayoutContextValue = {
    desktopCollapsed,
    collapseDesktop,
    expandDesktop,
  };

  return (
    <CatalogFiltersLayoutContext.Provider value={layoutValue}>
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
        onClick={closeDismiss}
      />

      <div
        className={`catalog-page-layout${desktopCollapsed ? ' is-filters-collapsed' : ''}`}
        data-catalog-filters-collapsed={desktopCollapsed ? '1' : '0'}
      >
        <aside
          id="catalog-filter-sidebar"
          className={`catalog-sidebar${open ? ' is-open' : ''}${
            desktopCollapsed ? ' is-desktop-collapsed' : ''
          }`}
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
              onClick={closeDismiss}
            >
              <X className="h-5 w-5" strokeWidth={1.75} />
            </button>
          </div>
          <div className="catalog-sidebar-scroll lg:contents">{sidebar}</div>
          {footer ? (
            <div className="catalog-sidebar-mobile-footer lg:hidden">
              {typeof footer === 'function' ? footer({ closeApply, closeDismiss }) : footer}
            </div>
          ) : null}
        </aside>

        <div className="catalog-main min-w-0">
          {desktopCollapsed ? (
            <button
              type="button"
              className="catalog-desktop-filters-reopen"
              onClick={expandDesktop}
              aria-expanded={false}
            >
              <SlidersHorizontal className="h-4 w-4" strokeWidth={1.75} aria-hidden />
              {activeCount > 0 ? `${title} (${activeCount})` : title}
              <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
            </button>
          ) : null}
          {children}
        </div>
      </div>
    </CatalogFiltersLayoutContext.Provider>
  );
}

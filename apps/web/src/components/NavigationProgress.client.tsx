'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Instant click feedback for App Router soft nav.
 * Next keeps the current UI until the RSC flight arrives (no loading.tsx /
 * pending chrome = "dead" 1-3s). This bar starts on same-origin <a> click.
 * Uses pathname only (no useSearchParams) to avoid root-layout CSR bailout.
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const [active, setActive] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setActive(false);
    delete document.documentElement.dataset.navPending;
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  }, [pathname]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented) return;
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest('a');
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target && anchor.target !== '_self') return;
      if (anchor.hasAttribute('download')) return;

      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#')) return;
      if (href.startsWith('mailto:') || href.startsWith('tel:')) return;

      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;

      const nextPath = `${url.pathname}${url.search}`;
      const currentPath = `${window.location.pathname}${window.location.search}`;
      if (nextPath === currentPath) return;

      setActive(true);
      document.documentElement.dataset.navPending = '1';
      if (hideTimer.current) clearTimeout(hideTimer.current);
      // Safety: never leave the bar stuck if navigation is cancelled.
      hideTimer.current = setTimeout(() => {
        setActive(false);
        delete document.documentElement.dataset.navPending;
      }, 12_000);
    };

    document.addEventListener('click', onClick, true);
    return () => {
      document.removeEventListener('click', onClick, true);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  if (!active) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[200] h-0.5 overflow-hidden"
      role="progressbar"
      aria-hidden="true"
    >
      <div className="nav-progress-bar h-full w-full origin-left bg-primary-600" />
    </div>
  );
}

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/** Collapse after this much downward scroll past the top band. */
const COLLAPSE_DELTA = 14;
/** Stay expanded while near the top of the page. */
const TOP_EXPAND_Y = 64;
/** Ignore scroll direction flips for a beat after a state change (stops expand/collapse thrash). */
const COOLDOWN_MS = 320;

/**
 * Sticky route toolbar: collapse after scrolling down; expand near top or via tap.
 *
 * Mid-page scroll-up does NOT expand (that remounted the full chrome and lagged on mobile).
 * Works on all viewports - desktop sticky was previously forced expanded forever.
 */
export function useMobileScrollCollapse() {
  const [collapsed, setCollapsed] = useState(false);
  const lastYRef = useRef(0);
  const lockedUntilRef = useRef(0);

  useEffect(() => {
    lastYRef.current = window.scrollY;

    const onScroll = () => {
      const y = window.scrollY;
      const now = performance.now();
      const lastY = lastYRef.current;
      lastYRef.current = y;

      if (now < lockedUntilRef.current) return;

      if (y < TOP_EXPAND_Y) {
        setCollapsed((prev) => {
          if (!prev) return prev;
          lockedUntilRef.current = now + COOLDOWN_MS;
          return false;
        });
        return;
      }

      if (y > lastY + COLLAPSE_DELTA) {
        setCollapsed((prev) => {
          if (prev) return prev;
          lockedUntilRef.current = now + COOLDOWN_MS;
          return true;
        });
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const expand = useCallback(() => {
    lockedUntilRef.current = performance.now() + COOLDOWN_MS;
    setCollapsed(false);
  }, []);

  const collapse = useCallback(() => {
    lockedUntilRef.current = performance.now() + COOLDOWN_MS;
    setCollapsed(true);
  }, []);

  return { collapsed, expand, collapse };
}

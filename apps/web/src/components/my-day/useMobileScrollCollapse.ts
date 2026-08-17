'use client';

import { useCallback, useEffect, useState } from 'react';

const LG_MQ = '(min-width: 1024px)';

/**
 * Mobile-only: collapse chrome after scrolling down; expand on scroll up.
 * Desktop (lg+) always reports expanded. Tap-to-expand is `expand()`.
 */
export function useMobileScrollCollapse() {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(LG_MQ);
    let lastY = window.scrollY;
    let ticking = false;

    const apply = (next: boolean) => {
      if (mq.matches) {
        setCollapsed(false);
        return;
      }
      setCollapsed((prev) => (prev === next ? prev : next));
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        ticking = false;
        const y = window.scrollY;
        if (mq.matches) {
          apply(false);
          lastY = y;
          return;
        }
        if (y < 48) {
          apply(false);
          lastY = y;
          return;
        }
        if (y > lastY + 8) apply(true);
        else if (y < lastY - 8) apply(false);
        lastY = y;
      });
    };

    const onMq = () => {
      if (mq.matches) setCollapsed(false);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    mq.addEventListener('change', onMq);
    return () => {
      window.removeEventListener('scroll', onScroll);
      mq.removeEventListener('change', onMq);
    };
  }, []);

  const expand = useCallback(() => setCollapsed(false), []);
  const collapse = useCallback(() => {
    if (window.matchMedia(LG_MQ).matches) return;
    setCollapsed(true);
  }, []);

  return { collapsed, expand, collapse };
}

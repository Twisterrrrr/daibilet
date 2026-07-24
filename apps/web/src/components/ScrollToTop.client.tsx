'use client';

import { ArrowUp } from 'lucide-react';
import { useEffect, useState } from 'react';

/** Show after scrolling roughly one viewport. */
const SHOW_AFTER_VIEWPORTS = 1;

export function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const update = () => {
      const threshold = window.innerHeight * SHOW_AFTER_VIEWPORTS;
      setVisible(window.scrollY > threshold);
    };

    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  const scrollToTop = () => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  };

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Наверх"
      tabIndex={visible ? 0 : -1}
      aria-hidden={!visible}
      className={`fixed z-30 inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/95 px-3.5 text-sm font-semibold text-slate-800 shadow-md backdrop-blur transition-[opacity,transform,colors] hover:bg-white hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 bottom-[max(5.5rem,calc(1rem+env(safe-area-inset-bottom,0px)))] right-4 sm:bottom-8 sm:right-6 ${
        visible ? 'pointer-events-auto translate-y-0 opacity-100' : 'pointer-events-none translate-y-2 opacity-0'
      }`}
    >
      <ArrowUp className="h-4 w-4 shrink-0" aria-hidden />
      <span>Наверх</span>
    </button>
  );
}

'use client';

import { ArrowUp } from 'lucide-react';
import { useEffect, useState } from 'react';

/** Show after scrolling roughly one viewport. */
const SHOW_AFTER_VIEWPORTS = 1;

/**
 * Back-to-top aligned to the content column (container-page), not the viewport edge.
 * Desktop: hide while site footer is in view so the chip does not cover legal links.
 */
export function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);
  const [footerBlocking, setFooterBlocking] = useState(false);

  useEffect(() => {
    const updateScroll = () => {
      const threshold = window.innerHeight * SHOW_AFTER_VIEWPORTS;
      setVisible(window.scrollY > threshold);
    };

    updateScroll();
    window.addEventListener('scroll', updateScroll, { passive: true });
    window.addEventListener('resize', updateScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', updateScroll);
      window.removeEventListener('resize', updateScroll);
    };
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 640px)');
    let observer: IntersectionObserver | null = null;
    let observed: Element | null = null;

    const disconnect = () => {
      observer?.disconnect();
      observer = null;
      observed = null;
    };

    const attach = () => {
      if (!mq.matches) {
        disconnect();
        setFooterBlocking(false);
        return;
      }
      const footer = document.querySelector('[data-site-footer]');
      if (!footer) {
        disconnect();
        setFooterBlocking(false);
        return;
      }
      if (observed === footer && observer) return;

      disconnect();
      observer = new IntersectionObserver(
        ([entry]) => {
          setFooterBlocking(Boolean(entry?.isIntersecting));
        },
        {
          root: null,
          rootMargin: '0px 0px -10% 0px',
          threshold: 0,
        },
      );
      observer.observe(footer);
      observed = footer;
    };

    attach();
    mq.addEventListener('change', attach);
    // Soft-nav remounts footer without a full reload - reattach cheaply on scroll ticks.
    const onScrollOrResize = () => attach();
    window.addEventListener('scroll', onScrollOrResize, { passive: true });
    window.addEventListener('resize', onScrollOrResize, { passive: true });

    return () => {
      mq.removeEventListener('change', attach);
      window.removeEventListener('scroll', onScrollOrResize);
      window.removeEventListener('resize', onScrollOrResize);
      disconnect();
    };
  }, []);

  const scrollToTop = () => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  };

  const show = visible && !footerBlocking;

  return (
    <div
      className={`pointer-events-none fixed inset-x-0 z-30 bottom-[max(5.5rem,calc(1rem+env(safe-area-inset-bottom,0px)))] sm:bottom-8 ${
        show ? '' : 'invisible'
      }`}
      aria-hidden={!show}
    >
      <div className="container-page relative">
        <button
          type="button"
          onClick={scrollToTop}
          aria-label="Наверх"
          tabIndex={show ? 0 : -1}
          className={`pointer-events-auto absolute right-4 bottom-0 inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/95 px-3.5 text-sm font-semibold text-slate-800 shadow-md backdrop-blur transition-[opacity,transform,colors] hover:bg-white hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 sm:right-6 ${
            show ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-2 opacity-0'
          }`}
        >
          <ArrowUp className="h-4 w-4 shrink-0" aria-hidden />
          <span>Наверх</span>
        </button>
      </div>
    </div>
  );
}

'use client';

import * as React from 'react';

import { DaibiletLogo } from '@/components/DaibiletLogo';
export function LandingStickyHeader() {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!visible) return null;

  return (
    <header className="fixed inset-x-0 top-[calc(var(--site-header-height)+env(safe-area-inset-top,0px))] z-40 border-b border-border bg-background/95 shadow-sm backdrop-blur-md">
      <div className="container-page flex h-14 items-center justify-between">
        <a href="/" className="flex items-center gap-2">
          <DaibiletLogo className="h-7 w-7 shrink-0" textClassName="text-sm sm:text-base" />
        </a>
        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          <a href="#variants" className="transition-colors hover:text-foreground">
            Расписание
          </a>
          <a href="#faq" className="transition-colors hover:text-foreground">
            FAQ
          </a>
          <a href="#reviews" className="transition-colors hover:text-foreground">
            Отзывы
          </a>
        </nav>
        <a
          href="#variants"
          className="inline-btn rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Купить билет
        </a>
      </div>
    </header>
  );
}

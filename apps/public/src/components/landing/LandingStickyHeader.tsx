import * as React from 'react';
import { Ship } from 'lucide-react';

export function LandingStickyHeader() {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!visible) return null;

  return (
    <header className="fixed left-0 right-0 top-0 z-50 border-b border-border bg-background/95 shadow-sm backdrop-blur-md">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <a href="/" className="flex items-center gap-2">
          <Ship className="h-5 w-5 text-primary" />
          <span className="text-sm font-bold text-foreground">Дайбилет</span>
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

import Link from 'next/link';
import { HelpCircle, LogIn, Menu, Route, X } from 'lucide-react';

import { DaibiletLogo } from '@/components/DaibiletLogo';

/** Static mobile destinations - city-aware hrefs enrich after hydration in SiteHeader. */
export const MOBILE_NAV_LINKS = [
  { label: 'Города', href: '/cities' },
  { label: 'События', href: '/events' },
  { label: 'Места', href: '/places' },
  { label: 'Подборки', href: '/podborki' },
  { label: 'Блог', href: '/blog' },
] as const;

type MobileNavDisclosureProps = {
  /** Unique checkbox id (page may host skeleton + header briefly). */
  id: string;
  links?: ReadonlyArray<{ label: string; href: string }>;
};

/**
 * Zero-JS mobile nav for loading/Suspense chrome.
 * Trigger stays in the header slot; input+sheet render as siblings outside
 * the backdrop-blur header (fixed descendants would otherwise clip).
 */
export function MobileNavDisclosureTrigger({ id }: { id: string }) {
  return (
    <label
      htmlFor={id}
      aria-label="Открыть меню"
      className="inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-lg text-graphite transition hover:bg-surface-muted lg:hidden"
    >
      <Menu className="h-5 w-5" strokeWidth={1.75} aria-hidden />
    </label>
  );
}

export function MobileNavDisclosureLayer({
  id,
  links = MOBILE_NAV_LINKS,
}: MobileNavDisclosureProps) {
  return (
    <div className="lg:hidden">
      <input id={id} type="checkbox" className="peer sr-only" />
      <div
        className="pointer-events-none invisible fixed inset-0 z-[60] opacity-0 transition-opacity duration-150 peer-checked:pointer-events-auto peer-checked:visible peer-checked:opacity-100"
        role="dialog"
        aria-modal="true"
        aria-label="Мобильная навигация"
      >
        <label
          htmlFor={id}
          aria-label="Закрыть меню"
          className="absolute inset-0 cursor-pointer bg-slate-900/45 backdrop-blur-[2px]"
        />
        <aside className="relative flex h-full w-[min(20rem,88vw)] flex-col bg-white shadow-card-hover">
          <div className="flex items-center justify-between px-4 py-4">
            <Link href="/" className="inline-flex items-center overflow-visible" aria-label="Дайбилет">
              <DaibiletLogo textClassName="text-xl" animated={false} />
            </Link>
            <label
              htmlFor={id}
              aria-label="Закрыть"
              className="cursor-pointer rounded-lg p-2 text-graphite-muted hover:bg-surface-muted hover:text-graphite"
            >
              <X className="h-5 w-5" strokeWidth={1.75} aria-hidden />
            </label>
          </div>

          <nav aria-label="Мобильная навигация" className="flex-1 overflow-y-auto p-2">
            <div>
              {links.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="block w-full rounded-lg px-4 py-3 text-left text-base font-medium text-graphite-muted hover:bg-surface-muted hover:text-graphite"
                >
                  {item.label}
                </Link>
              ))}
            </div>
            <div className="my-3 h-px bg-slate-100" />
            <Link
              href="/my-day"
              className="flex w-full items-center gap-2 rounded-lg px-4 py-3 text-left text-base font-medium text-graphite-muted hover:bg-surface-muted hover:text-graphite"
            >
              <Route className="h-4 w-4" strokeWidth={1.75} aria-hidden />
              Мой день
            </Link>
            <Link
              href="/help"
              className="flex w-full items-center gap-2 rounded-lg px-4 py-3 text-left text-base font-medium text-graphite-muted hover:bg-surface-muted hover:text-graphite"
            >
              <HelpCircle className="h-4 w-4" strokeWidth={1.75} aria-hidden />
              Помощь и FAQ
            </Link>
            <div className="my-3 h-px bg-slate-100" />
            <Link
              href="/login?returnUrl=/account/purchases"
              className="mx-2 mt-1 flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-3 text-base font-semibold text-white transition hover:bg-primary-700"
            >
              <LogIn className="h-4 w-4" strokeWidth={1.75} aria-hidden />
              Войти
            </Link>
          </nav>
        </aside>
      </div>
    </div>
  );
}

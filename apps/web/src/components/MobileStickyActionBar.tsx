import type { ReactNode } from 'react';

/**
 * Canonical mobile sticky bottom actions (see docs/mobile-templates.md).
 * Hidden from lg+; reserves safe-area for iOS home indicator.
 * Pair with `pb-24 lg:pb-0` (or similar) on the page root so content is not covered.
 */
export function MobileStickyActionBar({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur lg:hidden pb-[env(safe-area-inset-bottom,0px)] ${className}`.trim()}
    >
      <div className="container-page flex items-center gap-3 p-3">{children}</div>
    </div>
  );
}

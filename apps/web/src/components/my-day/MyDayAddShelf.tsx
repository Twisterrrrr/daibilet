'use client';

import type { ReactNode } from 'react';

type MyDayAddShelfProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Add-places shelf (scenarios / must-see / catalog / boat) - Wave 1 wraps as-is.
 */
export function MyDayAddShelf({ children, className = '' }: MyDayAddShelfProps) {
  return (
    <div className={`min-w-0 ${className}`.trim()} data-my-day-add-shelf="1">
      {children}
    </div>
  );
}

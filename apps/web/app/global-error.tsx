'use client';

import { PublicErrorScreen } from '@/components/PublicErrorScreen.client';

import './globals.css';

/**
 * Root-layout failures never reach app/error.tsx.
 * Without this file Next shows the English "Application error: a client-side exception..." screen.
 * Do not import next/font here: if fonts/layout crashed, this file must still render.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ru">
      <body className="font-sans">
        <PublicErrorScreen error={error} reset={reset} />
      </body>
    </html>
  );
}

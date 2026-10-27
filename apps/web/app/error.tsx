'use client';

import { PublicErrorScreen } from '@/components/PublicErrorScreen.client';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <PublicErrorScreen error={error} reset={reset} />;
}

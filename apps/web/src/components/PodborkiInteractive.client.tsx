'use client';

import dynamic from 'next/dynamic';
import type { ComponentProps } from 'react';

import type { LandingsCatalogView } from '@/components/LandingsCatalogView.client';

type Props = ComponentProps<typeof LandingsCatalogView>;

const InteractiveCatalog = dynamic(
  () => import('@/components/LandingsCatalogView.client').then((module) => module.LandingsCatalogView),
  { ssr: false },
);

/** Static links remain in HTML; interactive filters replace their presentation after mount. */
export function PodborkiInteractive(props: Props) {
  return <InteractiveCatalog {...props} />;
}

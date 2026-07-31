import { SiteChromeSkeleton } from '@/components/SiteChromeSkeleton';

/**
 * Soft-nav pending UI. SiteLayout lives inside each page (not root layout),
 * so this must include brand chrome — empty main-only skeleton would flash a
 * headerless frame.
 */
export default function RootLoading() {
  return <SiteChromeSkeleton variant="page" />;
}

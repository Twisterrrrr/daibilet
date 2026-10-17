'use client';

import { UserAuthProvider } from '@/hooks/useUserAuth';

export function SiteProviders({ children }: { children: React.ReactNode }) {
  return <UserAuthProvider>{children}</UserAuthProvider>;
}

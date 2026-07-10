'use client';

import * as React from 'react';

import { App } from '@/App';
import { hydratePublicHomePreview, hydratePublicShell } from '@/data';
import { UserAuthProvider } from '@/hooks/useUserAuth';

type NextPublicRouteProps = {
  path: string;
  search: string;
};

export function NextPublicRoute({ path, search }: NextPublicRouteProps) {
  const [dataVersion, refresh] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;
    const bump = () => {
      if (!cancelled) refresh((version) => version + 1);
    };

    void hydratePublicShell().then(bump);
    void hydratePublicHomePreview().then(bump);

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <UserAuthProvider>
      <App dataVersion={dataVersion} routePath={path} routeSearch={search} />
    </UserAuthProvider>
  );
}

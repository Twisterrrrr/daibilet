import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from '@/App';
import { hydratePublicHomePreview, hydratePublicDestinations, hydratePublicShell } from '@/data';
import { UserAuthProvider } from '@/hooks/useUserAuth';
import './globals.css';

if (/^\/(locations|venues)\//.test(window.location.pathname)) {
  void import('@/components/VenuePage');
}

function Root() {
  const [dataVersion, refresh] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const bump = () => {
      if (!cancelled) refresh((version) => version + 1);
    };

    const path = window.location.pathname.replace(/\/+$/, '') || '/';
    const needsHomePreview = path === '/' || path === '/podborki';

    if (needsHomePreview) {
      void hydratePublicShell().then(bump);
      void hydratePublicHomePreview().then(bump);
    } else {
      void hydratePublicDestinations().then(bump);
    }

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <StrictMode>
      <UserAuthProvider>
        <App dataVersion={dataVersion} />
      </UserAuthProvider>
    </StrictMode>
  );
}

createRoot(document.getElementById('root')!).render(<Root />);

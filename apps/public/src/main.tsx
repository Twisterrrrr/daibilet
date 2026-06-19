import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from '@/App';
import { hydratePublicData, hydratePublicStats } from '@/data';
import './globals.css';

function Root() {
  const [dataVersion, refresh] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void hydratePublicData().then((updated) => {
      if (!cancelled && updated) refresh((version) => version + 1);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <StrictMode>
      <App dataVersion={dataVersion} />
    </StrictMode>
  );
}

void hydratePublicStats().finally(() => {
  createRoot(document.getElementById('root')!).render(<Root />);
});

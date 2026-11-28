import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import { App } from '@/App';
import { hydrateAdminData } from '@/data';
import './index.css';

void bootstrap();

async function bootstrap() {
  await hydrateAdminData();

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '') || undefined}>
        <App />
      </BrowserRouter>
    </StrictMode>,
  );
}

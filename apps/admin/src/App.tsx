import { Navigate, Route, Routes } from 'react-router-dom';

import { AdminShell } from '@/components/admin/AdminShell';
import { ArticlesPage } from '@/pages/ArticlesPage';
import { BuyersPage } from '@/pages/BuyersPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { EventChangeRequestsPage } from '@/pages/EventChangeRequestsPage';
import { EventsPage } from '@/pages/EventsPage';
import { ExternalOrdersPage } from '@/pages/ExternalOrdersPage';
import { LandingsPage } from '@/pages/LandingsPage';
import { MappingInboxPage } from '@/pages/MappingInboxPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { SimplePage } from '@/pages/SimplePage';
import { SourcesPage } from '@/pages/SourcesPage';
import { VenuesPage } from '@/pages/VenuesPage';

export function App() {
  return (
    <Routes>
      <Route element={<AdminShell />}>
        <Route index element={<DashboardPage />} />
        <Route path="events" element={<EventsPage />} />
        {(import.meta.env.VITE_DAIBILET_EVENT_CHANGE_REQUESTS === '1') ? (
          <Route path="change-requests" element={<EventChangeRequestsPage />} />
        ) : null}
        <Route path="orders" element={<ExternalOrdersPage />} />
        <Route path="buyers" element={<BuyersPage />} />
        <Route path="venues" element={<VenuesPage />} />
        <Route path="cities" element={<SimplePage title="Города" description="Городские и региональные карточки каталога." kind="cities" />} />
        <Route path="landings" element={<LandingsPage />} />
        <Route path="articles" element={<ArticlesPage />} />
        <Route path="sources" element={<SourcesPage />} />
        <Route path="mapping-inbox" element={<MappingInboxPage />} />
        <Route path="sync-health" element={<SourcesPage />} />
        <Route path="taxonomy" element={<MappingInboxPage />} />
        <Route path="audit-log" element={<SimplePage title="Журнал изменений" description="Позже здесь появится audit log ручных правок." kind="audit" />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

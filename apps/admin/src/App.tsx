import * as React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import { AdminShell } from '@/components/admin/AdminShell';
import { LoadingState } from '@/components/admin/primitives';

const BuyersPage = React.lazy(() => import('@/pages/BuyersPage').then((module) => ({ default: module.BuyersPage })));
const DashboardPage = React.lazy(() => import('@/pages/DashboardPage').then((module) => ({ default: module.DashboardPage })));
const EventChangeRequestsPage = React.lazy(() => import('@/pages/EventChangeRequestsPage').then((module) => ({ default: module.EventChangeRequestsPage })));
const EventsPage = React.lazy(() => import('@/pages/EventsPage').then((module) => ({ default: module.EventsPage })));
const ExternalOrdersPage = React.lazy(() => import('@/pages/ExternalOrdersPage').then((module) => ({ default: module.ExternalOrdersPage })));
const LandingsPage = React.lazy(() => import('@/pages/LandingsPage').then((module) => ({ default: module.LandingsPage })));
const MappingInboxPage = React.lazy(() => import('@/pages/MappingInboxPage').then((module) => ({ default: module.MappingInboxPage })));
const SettingsPage = React.lazy(() => import('@/pages/SettingsPage').then((module) => ({ default: module.SettingsPage })));
const SimplePage = React.lazy(() => import('@/pages/SimplePage').then((module) => ({ default: module.SimplePage })));
const SourcesPage = React.lazy(() => import('@/pages/SourcesPage').then((module) => ({ default: module.SourcesPage })));
const VenuesPage = React.lazy(() => import('@/pages/VenuesPage').then((module) => ({ default: module.VenuesPage })));

export function App() {
  return (
    <Routes>
      <Route element={<AdminShell />}>
        <Route index element={<LazyPage><DashboardPage /></LazyPage>} />
        <Route path="events" element={<LazyPage><EventsPage /></LazyPage>} />
        <Route path="change-requests" element={<LazyPage><EventChangeRequestsPage /></LazyPage>} />
        <Route path="orders" element={<LazyPage><ExternalOrdersPage /></LazyPage>} />
        <Route path="buyers" element={<LazyPage><BuyersPage /></LazyPage>} />
        <Route path="venues" element={<LazyPage><VenuesPage /></LazyPage>} />
        <Route path="cities" element={<LazyPage><SimplePage title="Города" description="Городские и региональные карточки каталога." kind="cities" /></LazyPage>} />
        <Route path="landings" element={<LazyPage><LandingsPage /></LazyPage>} />
        <Route path="sources" element={<LazyPage><SourcesPage /></LazyPage>} />
        <Route path="mapping-inbox" element={<LazyPage><MappingInboxPage /></LazyPage>} />
        <Route path="sync-health" element={<LazyPage><SourcesPage /></LazyPage>} />
        <Route path="taxonomy" element={<LazyPage><MappingInboxPage /></LazyPage>} />
        <Route path="audit-log" element={<LazyPage><SimplePage title="Журнал изменений" description="Позже здесь появится audit log ручных правок." kind="audit" /></LazyPage>} />
        <Route path="settings" element={<LazyPage><SettingsPage /></LazyPage>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

function LazyPage({ children }: { children: React.ReactNode }) {
  return (
    <React.Suspense fallback={<LoadingState label="Загрузка раздела..." />}>
      {children}
    </React.Suspense>
  );
}

import { AdminDashboardView } from '@/components/admin/AdminDashboardView';
import { loadAdminDashboardPageData } from '@/server/admin-dashboard-data';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const data = await loadAdminDashboardPageData();
  return <AdminDashboardView data={data} />;
}

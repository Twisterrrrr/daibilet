import { redirect } from 'next/navigation';
import { AdminMfaSetup } from '@/components/admin/AdminMfaSetup.client';
import { getCurrentAdminUser } from '@/server/admin-session';

export const metadata = { title: 'Двухфакторная защита | Админка', robots: { index: false, follow: false } };

export default async function AdminMfaPage({ searchParams }: { searchParams: Promise<{ returnUrl?: string }> }) {
  const user = await getCurrentAdminUser();
  if (!user) redirect('/admin/login');
  const params = await searchParams;
  const requestedReturn = params.returnUrl || '/admin';
  const returnUrl = (requestedReturn === '/admin' || requestedReturn.startsWith('/admin/'))
    && !requestedReturn.startsWith('//')
    && requestedReturn !== '/admin/login'
    && !requestedReturn.startsWith('/admin/security/mfa')
    ? requestedReturn
    : '/admin';
  const requiresMfa = user.roles.some((role) => role === 'FINANCE' || role === 'SUPERADMIN');
  if (!requiresMfa) redirect(returnUrl);
  if (user.mfaVerified) redirect(returnUrl);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <AdminMfaSetup enabled={user.mfaEnabled} returnUrl={returnUrl} />
    </main>
  );
}

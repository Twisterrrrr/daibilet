import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { AdminNextShell } from '@/components/admin/AdminNextShell';
import { resolveAdminSessionPermissions } from '@daibilet/contracts/admin-access/runtime';
import { getCurrentAdminUser } from '@/server/admin-session';

export const metadata: Metadata = {
  title: {
    absolute: 'Админка | Дайбилет',
  },
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const staffSessionsEnabled = process.env.DAIBILET_ADMIN_RBAC_ENFORCE === '1';
  const user = staffSessionsEnabled ? await getCurrentAdminUser() : null;
  const permissions = user ? [...resolveAdminSessionPermissions(user.roles, user.mfaVerified)] : null;
  return (
    <AdminNextShell
      permissions={permissions}
      staffUser={user ? { displayName: user.displayName, email: user.email, roles: user.roles } : null}
      staffSessionsEnabled={staffSessionsEnabled}
    >
      {children}
    </AdminNextShell>
  );
}

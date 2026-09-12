import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { AdminNextShell } from '@/components/admin/AdminNextShell';

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

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminNextShell>{children}</AdminNextShell>;
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function AdminLogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function logout() {
    setBusy(true);
    try {
      await fetch('/api/admin/auth/logout', { method: 'POST', cache: 'no-store' });
    } finally {
      router.replace('/admin/login');
      router.refresh();
    }
  }

  return (
    <button
      type="button"
      onClick={logout}
      disabled={busy}
      className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
    >
      {busy ? 'Выходим…' : 'Выйти'}
    </button>
  );
}

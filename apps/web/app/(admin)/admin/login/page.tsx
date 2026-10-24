import { Suspense } from 'react';
import { AdminLoginForm } from '@/components/admin/AdminLoginForm.client';

export const dynamic = 'force-dynamic';

export default function AdminLoginPage() {
  return (
    <div className="py-12">
      <Suspense fallback={<p className="text-center text-sm text-slate-500">Загрузка формы входа…</p>}>
        <AdminLoginForm />
      </Suspense>
    </div>
  );
}

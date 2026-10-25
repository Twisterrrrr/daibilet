import { loginAdminAction } from '@/server/admin-auth-actions';

const errors: Record<string, string> = {
  invalid_input: 'Введите рабочий email и пароль.',
  invalid_credentials: 'Не удалось войти. Проверьте email и пароль.',
  rate_limited: 'Слишком много попыток. Попробуйте позже.',
  service_unavailable: 'Сервис входа временно недоступен.',
};

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ error?: string; returnUrl?: string }> }) {
  const params = await searchParams;
  const error = params.error ? errors[params.error] : null;
  const returnUrl = params.returnUrl?.startsWith('/admin') && !params.returnUrl.startsWith('//') ? params.returnUrl : '/admin';
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
        <div className="mb-7">
          <p className="text-sm font-semibold text-indigo-600">Дайбилет · рабочее пространство</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">Вход для сотрудников</h1>
          <p className="mt-2 text-sm text-slate-600">Используйте персональную учётную запись, выданную администратором.</p>
        </div>
        {error ? <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p> : null}
        <form action={loginAdminAction} className="space-y-4">
          <input type="hidden" name="returnUrl" value={returnUrl} />
          <label className="block text-sm font-medium text-slate-700">
            Рабочий email
            <input autoComplete="username" name="email" type="email" required maxLength={254} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Пароль
            <input autoComplete="current-password" name="password" type="password" required maxLength={1024} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
          </label>
          <button className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-300">Войти</button>
        </form>
      </section>
    </main>
  );
}

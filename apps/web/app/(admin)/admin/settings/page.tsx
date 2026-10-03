import Link from 'next/link';

import { NEXT_ADMIN_BASE, PUBLIC_SITE_BASE } from '@/lib/admin-ui';
import { isAdminAuthConfigured, readAdminBasicAuthConfig } from '@/lib/admin-basic-auth';
import { resolveAdminApiBase } from '@/server/admin-api-fetch';

export const dynamic = 'force-dynamic';

/** Read-only MVP flags - mirror Vite Settings; no write API exists. */
const FEATURE_FLAGS = [
  { id: 'venue-pages', label: 'Карточки площадок', enabled: true },
  { id: 'managed-landings', label: 'Управляемые SEO-лендинги', enabled: true },
  { id: 'provider-widgets', label: 'Покупка через виджеты провайдеров', enabled: true },
  { id: 'teplohod-sync', label: 'Импорт Teplohod.info', enabled: true },
  { id: 'orders-mirror', label: 'Зеркало заказов источников', enabled: true },
] as const;

export default function AdminSettingsPage() {
  const auth = readAdminBasicAuthConfig();
  const apiBase = resolveAdminApiBase();
  const authConfigured = isAdminAuthConfigured(auth);

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Настройки</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Read-only операционный контур. Отдельного `/api/admin/settings` нет - как в Vite Settings.
            Writable toggles не выдумываем.
          </p>
        </div>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900">Доступ и API</h3>
        <p className="mt-1 text-xs text-slate-500">
          Admin UI и API закрыты Basic Auth. Смена прав из UI недоступна.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <Row label="Basic Auth configured" value={authConfigured ? 'да' : 'нет (dev open)'} />
          <Row label="Auth realm" value={auth.realm} />
          <Row label="Admin API base" value={apiBase} />
          <Row label="Require auth" value={auth.requireAuth ? 'да' : 'нет'} />
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Импорты</h3>
            <p className="mt-1 text-xs text-slate-500">Схема источников и ручной sync - на экране Источники.</p>
          </div>
          <Link href="/admin/sources" className="text-xs text-sky-700 hover:underline">
            К источникам
          </Link>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <Row label="Ticketscloud" value="токен + API; полный sync вручную" />
          <Row label="Teplohod.info" value="API с белого IP; sync из Источников" />
          <Row label="Окно ре-импорта" value="последние 90 дней / активные события" />
          <Row label="Переопределения" value="сохраняются поверх импортных фактов" />
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900">Публичная витрина</h3>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <Row label="Публичный сайт" value={PUBLIC_SITE_BASE} />
          <Row label="Админка (Next канон)" value={NEXT_ADMIN_BASE} />
          <Row label="Vite /legacy" value="retired (F4.6)" />
          <Row label="Бренд" value="Дайбилет" />
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold text-slate-900">Фича-флаги</h3>
          <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-500">
            только чтение
          </span>
        </div>
        <p className="mb-3 text-xs text-slate-500">
          Состояние MVP-функций без API-контракта на изменение. Не кликабельны.
        </p>
        <ul className="divide-y divide-slate-200 rounded-md border border-slate-200">
          {FEATURE_FLAGS.map((flag) => (
            <li key={flag.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
              <span className="text-slate-700">{flag.label}</span>
              <span
                className={`rounded-md border px-2 py-0.5 text-xs ${
                  flag.enabled
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'border-slate-200 bg-white text-slate-500'
                }`}
              >
                {flag.enabled ? 'on' : 'off'}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900">Роли (UX-контур)</h3>
        <p className="mt-1 text-xs text-slate-500">
          Пока один Basic Auth аккаунт. Роли ниже - задел, не ACL runtime.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Админ', description: 'все разделы' },
            { label: 'Редактор', description: 'контент и модерация' },
            { label: 'SEO', description: 'лендинги и мета' },
            { label: 'Наблюдатель', description: 'только просмотр' },
          ].map((role) => (
            <div key={role.label} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
              <div className="text-sm font-medium text-slate-900">{role.label}</div>
              <div className="text-xs text-slate-500">{role.description}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-0.5 break-all text-sm text-slate-800">{value}</div>
    </div>
  );
}

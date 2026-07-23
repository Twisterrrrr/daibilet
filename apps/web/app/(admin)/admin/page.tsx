export default function AdminDashboardStubPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">F4: admin в Next</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
          Стартовый инкремент: route group <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">/admin</code>,
          Basic Auth в middleware и эта заглушка дашборда. Операции пока на Vite SPA
          (`apps/admin`, admin.daibilet.ru). Finance contour не трогаем.
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[
          {
            title: 'Сделано',
            body: 'Shell + auth gate + robots noindex. Публичный сайт не затронут.',
          },
          {
            title: 'Следующий шаг',
            body: 'Перенести DashboardPage: live metrics с legacy /api/admin/dashboard.',
          },
          {
            title: 'Канон до cutover',
            body: 'Писать и модерировать в Vite admin. Next /admin - миграционный контур.',
          },
        ].map((card) => (
          <article
            key={card.title}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <h3 className="text-sm font-semibold text-slate-900">{card.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{card.body}</p>
          </article>
        ))}
      </section>

      <section className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5">
        <h3 className="text-sm font-semibold text-slate-900">План переноса экранов</h3>
        <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm text-slate-600">
          <li>Дашборд (read-only metrics)</li>
          <li>События / лендинги / статьи (операторский CRUD)</li>
          <li>Источники и sync health</li>
          <li>Cutover admin.daibilet.ru → Next; Vite admin retire</li>
        </ol>
      </section>
    </div>
  );
}

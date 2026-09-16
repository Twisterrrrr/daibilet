import { setHeroBannerActiveAction } from '@/server/admin-hero-banner-actions';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminHeroBannersPage({ searchParams }: PageProps) {
  const raw = await searchParams;
  let rows: Array<{
    id: string;
    title: string;
    imageUrl: string;
    link: string | null;
    isActive: boolean;
    sortOrder: number;
  }> = [];
  let loadError: string | null = null;

  try {
    rows = await prisma.heroBanner.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        title: true,
        imageUrl: true,
        link: true,
        isActive: true,
        sortOrder: true,
      },
    });
  } catch (error) {
    loadError = error instanceof Error ? error.message : 'Не удалось загрузить HeroBanner';
  }

  return (
    <div className="space-y-4">
      <header>
        <h2 className="text-xl font-semibold text-slate-900">Hero-баннеры главной</h2>
        <p className="mt-1 text-sm text-slate-600">
          Ротатор на `/`. Toggle isActive - без CRUD картинок в этом инкременте (seed + файлы в `/images/hero`).
        </p>
      </header>

      {first(raw.ok) === '1' ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
          Баннер обновлён.
        </div>
      ) : null}
      {loadError ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
          {loadError}. Проверьте, что migration `20260724020000_hero_banner` применена.
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Sort</th>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Image</th>
              <th className="px-4 py-3">Link</th>
              <th className="px-4 py-3">Active</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3 tabular-nums text-slate-500">{row.sortOrder}</td>
                <td className="px-4 py-3 font-medium text-slate-900">{row.title}</td>
                <td className="max-w-[220px] truncate px-4 py-3 text-slate-500" title={row.imageUrl}>
                  {row.imageUrl}
                </td>
                <td className="max-w-[160px] truncate px-4 py-3 text-slate-500" title={row.link || ''}>
                  {row.link || '-'}
                </td>
                <td className="px-4 py-3">
                  <form action={setHeroBannerActiveAction}>
                    <input type="hidden" name="id" value={row.id} />
                    <input type="hidden" name="isActive" value={row.isActive ? 'false' : 'true'} />
                    <button
                      type="submit"
                      className={
                        row.isActive
                          ? 'rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white'
                          : 'rounded-md bg-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700'
                      }
                    >
                      {row.isActive ? 'On' : 'Off'}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {!rows.length && !loadError ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  Нет баннеров. Примените seed migration.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

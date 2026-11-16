'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { createAdminRegionAction } from '@/server/admin-destination-pdp-actions';

type Region = { id: string; title: string; slug: string; _count: { cities: number }; pdpDocument: { status: string; isIndexable: boolean } | null };

export function RegionsManager({ regions }: { regions: Region[] }) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();

  function create() {
    setError('');
    startTransition(async () => {
      try {
        const { region } = await createAdminRegionAction(title.trim(), slug.trim().toLowerCase());
        router.push(`/admin/cities/regions/${encodeURIComponent(region.id)}`);
      } catch (cause) { setError(cause instanceof Error ? cause.message : 'Не удалось создать регион'); }
    });
  }

  return <div className="space-y-4">
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="font-semibold text-slate-900">Создать региональный хаб</h3>
      <p className="mt-1 text-sm text-slate-600">Создание записи региона само по себе не публикует PDP. Сначала наполните страницу в редакторе, проверьте её и отдельно опубликуйте.</p>
      <div className="mt-3 grid gap-2 md:grid-cols-[1fr_1fr_auto]">
        <input aria-label="Название региона" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ленинградская область" className={inputClass} />
        <input aria-label="Slug региона" value={slug} onChange={(e) => setSlug(e.target.value.replace(/[^a-z0-9-]/g, ''))} placeholder="leningradskaya-oblast" className={`${inputClass} font-mono`} />
        <button type="button" onClick={create} disabled={pending || !title.trim() || !slug.trim()} className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{pending ? 'Создаю…' : 'Создать черновик'}</button>
      </div>
      {error ? <p role="alert" className="mt-2 text-sm text-red-700">{error}</p> : null}
    </section>
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-4 py-3"><h3 className="font-semibold text-slate-900">Регионы в системе</h3></div>
      {regions.length ? <ul className="divide-y divide-slate-100">{regions.map((region) => <li key={region.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div><Link href={`/admin/cities/regions/${encodeURIComponent(region.id)}`} className="font-medium text-blue-700 hover:underline">{region.title}</Link><p className="mt-0.5 text-xs text-slate-500"><span className="font-mono">{region.slug}</span> · {region._count.cities} городов · {region.pdpDocument?.status || 'PDP ещё не создана'}{region.pdpDocument?.isIndexable ? ' · index' : ' · noindex'}</p></div>
        <Link href={`/cities/${encodeURIComponent(region.slug)}`} target="_blank" className="text-xs text-slate-600 hover:underline">Открыть на сайте ↗</Link>
      </li>)}</ul> : <p className="px-4 py-8 text-center text-sm text-slate-500">Регионов пока нет.</p>}
    </section>
  </div>;
}

const inputClass = 'w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400';

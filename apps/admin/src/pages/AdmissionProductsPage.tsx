import type {
  AdminAdmissionClassificationPatchDto,
  AdminAdmissionProductDto,
  AdminAdmissionProductsListDto,
  AdmissionProductTypeDto,
  AdmissionValidityModeDto,
} from '@daibilet/contracts/catalog';
import { Search, Save, ChevronLeft, ChevronRight } from 'lucide-react';
import React from 'react';

import { adminFetch } from '@/lib/admin-api';

const PAGE_SIZE = 25;

const TYPE_OPTIONS: Array<{ value: AdmissionProductTypeDto; label: string }> = [
  { value: 'MUSEUM_ENTRY', label: 'Билет в музей' },
  { value: 'GALLERY_ENTRY', label: 'Билет в галерею' },
  { value: 'ART_SPACE_ENTRY', label: 'Арт-пространство' },
  { value: 'EXHIBITION_ENTRY', label: 'Билет на выставку' },
  { value: 'OBSERVATION_ENTRY', label: 'Смотровая площадка' },
  { value: 'PARK_ENTRY', label: 'Посещение парка' },
  { value: 'ATTRACTION_ENTRY', label: 'Аттракцион' },
  { value: 'ZOO_ENTRY', label: 'Зоопарк' },
  { value: 'AQUARIUM_ENTRY', label: 'Аквариум' },
  { value: 'COMPLEX_ENTRY', label: 'Комплексный билет' },
  { value: 'OTHER', label: 'Другое' },
];

const VALIDITY_OPTIONS: Array<{ value: AdmissionValidityModeDto; label: string }> = [
  { value: 'OPEN_DATE', label: 'Открытая дата' },
  { value: 'FIXED_WINDOW', label: 'Период действия' },
  { value: 'VALID_DAYS_AFTER_PURCHASE', label: 'Дней после покупки' },
];

type FormState = AdminAdmissionClassificationPatchDto;

function toForm(item: AdminAdmissionProductDto): FormState {
  return {
    type: item.type,
    categoryId: item.categoryId,
    primarySubcategoryId: item.primarySubcategoryId,
    validityMode: item.validityMode,
    validFrom: item.validFrom,
    validTo: item.validTo,
    validDaysAfterPurchase: item.validDaysAfterPurchase,
    salesStartsAt: item.salesStartsAt,
    salesEndsAt: item.salesEndsAt,
  };
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    PUBLISHED: 'Опубликован', REVIEW: 'На проверке', DRAFT: 'Черновик', HIDDEN: 'Скрыт', ARCHIVED: 'В архиве',
  };
  return labels[status] || 'Статус не указан';
}

export function AdmissionProductsPage() {
  const [payload, setPayload] = React.useState<AdminAdmissionProductsListDto | null>(null);
  const [selected, setSelected] = React.useState<AdminAdmissionProductDto | null>(null);
  const [form, setForm] = React.useState<FormState | null>(null);
  const [queryDraft, setQueryDraft] = React.useState('');
  const [query, setQuery] = React.useState('');
  const [offset, setOffset] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');
  const [notice, setNotice] = React.useState('');

  const load = React.useCallback(async (nextOffset: number, nextQuery: string, signal?: AbortSignal) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(nextOffset) });
      if (nextQuery) params.set('q', nextQuery);
      const response = await adminFetch(`/api/admin/admission-products?${params.toString()}`, { cache: 'no-store', signal });
      if (!response.ok) throw new Error(`Не удалось загрузить билеты (HTTP ${response.status})`);
      const result = await response.json() as AdminAdmissionProductsListDto;
      setPayload(result);
      const current = result.items[0] || null;
      setSelected(current);
      setForm(current ? toForm(current) : null);
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === 'AbortError') return;
      setError(cause instanceof Error ? cause.message : 'Не удалось загрузить билеты');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    const controller = new AbortController();
    void load(offset, query, controller.signal);
    return () => controller.abort();
  }, [load, offset, query]);

  React.useEffect(() => {
    if (!selected) {
      setForm(null);
      return;
    }
    setForm(toForm(selected));
  }, [selected]);

  const choose = (item: AdminAdmissionProductDto) => {
    setNotice('');
    setSelected(item);
    setForm(toForm(item));
  };

  const submitSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSelected(null);
    setOffset(0);
    setQuery(queryDraft.trim());
  };

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected || !form) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const response = await adminFetch(`/api/admin/admission-products/${encodeURIComponent(selected.id)}/classification`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(form),
      });
      const result = await response.json() as { item?: AdminAdmissionProductDto; error?: string };
      if (!response.ok || !result.item) throw new Error(result.error || `Не удалось сохранить (HTTP ${response.status})`);
      setSelected(result.item);
      setPayload((current) => current ? {
        ...current,
        items: current.items.map((item) => item.id === result.item!.id ? result.item! : item),
      } : current);
      setForm(toForm(result.item));
      setNotice('Изменения сохранены');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Не удалось сохранить изменения');
    } finally {
      setSaving(false);
    }
  };

  const subcategories = (payload?.subcategories || []).filter((item) => item.categoryId === form?.categoryId);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">Входные билеты</h1>
        <p className="mt-1 text-sm text-slate-600">Классификация и сроки действия AdmissionProduct. Существующие категории Event не переклассифицируются.</p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(18rem,0.8fr)_minmax(32rem,1.2fr)]">
        <section className="min-w-0 rounded-xl border border-slate-200 bg-white">
          <form onSubmit={submitSearch} className="flex gap-2 border-b border-slate-200 p-3">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={queryDraft} onChange={(event) => setQueryDraft(event.target.value)} placeholder="Название или площадка" className="h-10 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-primary-500" />
            </div>
            <button type="submit" className="h-10 rounded-lg bg-slate-900 px-4 text-sm font-medium text-white">Найти</button>
          </form>
          <div className="max-h-[72vh] overflow-y-auto">
            {loading && !payload ? <p className="p-5 text-sm text-slate-500">Загрузка…</p> : null}
            {!loading && payload?.items.length === 0 ? <p className="p-5 text-sm text-slate-500">Ничего не найдено.</p> : null}
            {payload?.items.map((item) => (
              <button key={item.id} type="button" onClick={() => choose(item)} className={`block w-full border-b border-slate-100 px-4 py-3 text-left transition hover:bg-slate-50 ${selected?.id === item.id ? 'bg-primary-50' : ''}`}>
                <span className="block truncate text-sm font-semibold text-slate-900">{item.title}</span>
                <span className="mt-1 block truncate text-xs text-slate-500">{item.venue.title}{item.city?.title ? ` · ${item.city.title}` : ''} · {statusLabel(item.status)}</span>
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between border-t border-slate-200 px-3 py-2 text-xs text-slate-500">
            <span>{payload ? `${payload.total} предложений` : ''}</span>
            <div className="flex gap-1">
              <button type="button" disabled={offset <= 0 || loading} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))} className="grid h-8 w-8 place-items-center rounded-md hover:bg-slate-100 disabled:opacity-40" aria-label="Предыдущая страница"><ChevronLeft className="h-4 w-4" /></button>
              <button type="button" disabled={!payload?.hasMore || loading} onClick={() => setOffset(offset + PAGE_SIZE)} className="grid h-8 w-8 place-items-center rounded-md hover:bg-slate-100 disabled:opacity-40" aria-label="Следующая страница"><ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>
        </section>

        <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
          {!selected || !form ? (
            <div className="py-12 text-center text-sm text-slate-500">Выберите билет, чтобы изменить классификацию.</div>
          ) : (
            <form onSubmit={save} className="space-y-5">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{selected.venue.title}{selected.city?.title ? ` · ${selected.city.title}` : ''}</p>
                <h2 className="mt-1 text-xl font-semibold text-slate-950">{selected.title}</h2>
                <p className="mt-1 text-xs text-slate-500">{statusLabel(selected.status)}</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium text-slate-700">Тип продукта
                  <select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as AdmissionProductTypeDto })} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm">
                    {TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </label>
                <label className="text-sm font-medium text-slate-700">Существующая категория
                  <select value={form.categoryId || ''} onChange={(event) => setForm({ ...form, categoryId: event.target.value || null, primarySubcategoryId: null })} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm">
                    <option value="">Не выбрана</option>
                    {(payload?.categories || []).map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
                  </select>
                </label>
                <label className="text-sm font-medium text-slate-700 sm:col-span-2">Основная подкатегория
                  <select value={form.primarySubcategoryId || ''} onChange={(event) => setForm({ ...form, primarySubcategoryId: event.target.value || null })} disabled={!form.categoryId} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm disabled:bg-slate-50">
                    <option value="">Не выбрана</option>
                    {subcategories.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
                  </select>
                </label>
                <label className="text-sm font-medium text-slate-700 sm:col-span-2">Режим срока действия
                  <select value={form.validityMode} onChange={(event) => setForm({ ...form, validityMode: event.target.value as AdmissionValidityModeDto, validDaysAfterPurchase: event.target.value === 'VALID_DAYS_AFTER_PURCHASE' ? form.validDaysAfterPurchase : null })} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm">
                    {VALIDITY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </label>
                {form.validityMode === 'VALID_DAYS_AFTER_PURCHASE' ? (
                  <label className="text-sm font-medium text-slate-700">Дней после покупки
                    <input type="number" min={1} max={3650} value={form.validDaysAfterPurchase ?? ''} onChange={(event) => setForm({ ...form, validDaysAfterPurchase: event.target.value ? Number(event.target.value) : null })} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" />
                  </label>
                ) : (
                  <>
                    <label className="text-sm font-medium text-slate-700">Действует с
                      <input type="date" value={form.validFrom || ''} onChange={(event) => setForm({ ...form, validFrom: event.target.value || null })} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" />
                    </label>
                    <label className="text-sm font-medium text-slate-700">Действует до
                      <input type="date" value={form.validTo || ''} onChange={(event) => setForm({ ...form, validTo: event.target.value || null })} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" />
                    </label>
                  </>
                )}
                <label className="text-sm font-medium text-slate-700">Продажи с
                  <input type="date" value={form.salesStartsAt || ''} onChange={(event) => setForm({ ...form, salesStartsAt: event.target.value || null })} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" />
                </label>
                <label className="text-sm font-medium text-slate-700">Продажи до
                  <input type="date" value={form.salesEndsAt || ''} onChange={(event) => setForm({ ...form, salesEndsAt: event.target.value || null })} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" />
                </label>
              </div>

              {error ? <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
              {notice ? <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{notice}</p> : null}
              <div className="flex justify-end border-t border-slate-100 pt-4">
                <button type="submit" disabled={saving} className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary-600 px-4 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50">
                  <Save className="h-4 w-4" />{saving ? 'Сохраняем…' : 'Сохранить'}
                </button>
              </div>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}

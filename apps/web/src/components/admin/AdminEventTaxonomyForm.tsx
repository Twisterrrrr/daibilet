'use client';

import { useMemo, useState } from 'react';

import { saveAdminEventTaxonomyAction } from '@/server/admin-event-actions';
import type { AdminEventDetailData, AdminTaxonomyData } from '@/server/admin-events-data';

type Props = {
  eventId: string;
  classification: AdminEventDetailData['classification'];
  taxonomy: AdminTaxonomyData;
};

export function AdminEventTaxonomyForm({ eventId, classification, taxonomy }: Props) {
  const [categoryId, setCategoryId] = useState(classification.categoryId || '');
  const [primarySubcategoryId, setPrimarySubcategoryId] = useState(
    classification.primarySubcategoryId || '',
  );
  const [subcategoryIds, setSubcategoryIds] = useState<string[]>(classification.subcategoryIds || []);
  const [tagIds, setTagIds] = useState<string[]>(classification.tagIds || []);
  const [tagQuery, setTagQuery] = useState('');

  const categorySubcategories = useMemo(
    () => taxonomy.subcategories.filter((item) => item.categoryId === categoryId),
    [categoryId, taxonomy.subcategories],
  );

  const visibleTags = useMemo(() => {
    const q = tagQuery.trim().toLowerCase();
    const selected = new Set(tagIds);
    return taxonomy.tags
      .filter(
        (tag) =>
          selected.has(tag.id) ||
          !q ||
          tag.title.toLowerCase().includes(q) ||
          tag.slug.toLowerCase().includes(q),
      )
      .slice(0, 48);
  }, [tagIds, tagQuery, taxonomy.tags]);

  function onCategoryChange(next: string) {
    setCategoryId(next);
    setPrimarySubcategoryId('');
    setSubcategoryIds([]);
  }

  function toggleSubcategory(id: string) {
    setSubcategoryIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  function toggleTag(id: string) {
    setTagIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  if (taxonomy.errors.length && taxonomy.categories.length === 0) {
    return (
      <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        Справочник taxonomy не загрузился. Проверь API `/api/admin/taxonomy`.
      </section>
    );
  }

  return (
    <form
      action={saveAdminEventTaxonomyAction}
      className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <input type="hidden" name="id" value={eventId} />
      {subcategoryIds.map((id) => (
        <input key={`sub-${id}`} type="hidden" name="subcategoryIds" value={id} />
      ))}
      {tagIds.map((id) => (
        <input key={`tag-${id}`} type="hidden" name="tagIds" value={id} />
      ))}

      <div>
        <h3 className="text-sm font-semibold text-slate-900">Классификация (taxonomy)</h3>
        <p className="mt-1 text-xs text-slate-500">
          Категория, основная подкатегория и теги. Влияет на каталог и лендинги.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="block space-y-1">
          <span className="text-xs font-medium text-slate-600">Категория</span>
          <select
            name="categoryId"
            value={categoryId}
            onChange={(event) => onCategoryChange(event.target.value)}
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="">Не выбрано</option>
            {taxonomy.categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.title}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-medium text-slate-600">Основная подкатегория</span>
          <select
            name="primarySubcategoryId"
            value={primarySubcategoryId}
            onChange={(event) => setPrimarySubcategoryId(event.target.value)}
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="">Не выбрано</option>
            {categorySubcategories.map((subcategory) => (
              <option key={subcategory.id} value={subcategory.id}>
                {subcategory.title}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div>
        <div className="mb-2 text-xs font-medium text-slate-600">Доп. подкатегории</div>
        <div className="flex flex-wrap gap-2">
          {categorySubcategories.length === 0 ? (
            <span className="text-xs text-slate-500">Сначала выбери категорию</span>
          ) : (
            categorySubcategories.map((subcategory) => (
              <label
                key={subcategory.id}
                className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-1.5 text-xs"
              >
                <input
                  type="checkbox"
                  checked={subcategoryIds.includes(subcategory.id)}
                  onChange={() => toggleSubcategory(subcategory.id)}
                />
                {subcategory.title}
              </label>
            ))
          )}
        </div>
      </div>

      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-medium text-slate-600">Теги ({tagIds.length})</span>
          <input
            value={tagQuery}
            onChange={(event) => setTagQuery(event.target.value)}
            placeholder="Найти тег..."
            className="w-48 rounded-md border border-slate-200 px-2 py-1 text-xs"
          />
        </div>
        <div className="flex max-h-48 flex-wrap gap-2 overflow-y-auto rounded-md border border-slate-100 p-2">
          {visibleTags.map((tag) => (
            <label
              key={tag.id}
              className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-1.5 text-xs"
            >
              <input
                type="checkbox"
                checked={tagIds.includes(tag.id)}
                onChange={() => toggleTag(tag.id)}
              />
              {tag.title}
            </label>
          ))}
        </div>
      </div>

      <button
        type="submit"
        className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
      >
        Сохранить taxonomy
      </button>
    </form>
  );
}

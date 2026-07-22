import * as React from 'react';
import { adminFetch } from '@/lib/admin-api';
import { Loader2, Plus, Save } from 'lucide-react';

import { DataTableShell, PageHeader, StatusBadge } from '@/components/admin/primitives';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { formatDateTime } from '@/data';


type ArticleRow = {
  id: string;
  slug: string;
  status: string;
  title: string;
  excerpt: string;
  coverImageUrl?: string | null;
  city?: string | null;
  citySlug?: string | null;
  publishedAt?: string | null;
  updatedAt?: string | null;
};

type ArticleDetail = ArticleRow & {
  content: string;
  seoTitle?: string | null;
  seoDescription?: string | null;
  canonicalPath?: string | null;
  isIndexable: boolean;
};

type ArticleDraft = {
  title: string;
  slug: string;
  status: string;
  excerpt: string;
  content: string;
  coverImageUrl: string;
  citySlug: string;
  seoTitle: string;
  seoDescription: string;
  canonicalPath: string;
  isIndexable: boolean;
  publishedAt: string;
};

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Черновик' },
  { value: 'review', label: 'На проверке' },
  { value: 'published', label: 'Опубликовано' },
  { value: 'hidden', label: 'Скрыто' },
];

function emptyDraft(): ArticleDraft {
  return {
    title: '',
    slug: '',
    status: 'draft',
    excerpt: '',
    content: '',
    coverImageUrl: '',
    citySlug: '',
    seoTitle: '',
    seoDescription: '',
    canonicalPath: '',
    isIndexable: false,
    publishedAt: '',
  };
}

function toDatetimeLocalValue(iso?: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromDatetimeLocalValue(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function detailToDraft(detail: ArticleDetail): ArticleDraft {
  return {
    title: detail.title,
    slug: detail.slug,
    status: detail.status,
    excerpt: detail.excerpt || '',
    content: detail.content || '',
    coverImageUrl: detail.coverImageUrl || '',
    citySlug: detail.citySlug || '',
    seoTitle: detail.seoTitle || detail.title,
    seoDescription: detail.seoDescription || detail.excerpt || '',
    canonicalPath: detail.canonicalPath || `/blog/${detail.slug}`,
    isIndexable: detail.isIndexable,
    publishedAt: toDatetimeLocalValue(detail.publishedAt),
  };
}

function articleStatusBadge(status: string) {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'published') return <StatusBadge status="live" label="опубликовано" />;
  if (normalized === 'review') return <StatusBadge status="ready" label="на проверке" />;
  if (normalized === 'hidden') return <StatusBadge status="archived" label="скрыто" />;
  return <StatusBadge status="draft" label={normalized === 'draft' ? 'черновик' : normalized || 'черновик'} />;
}

export function ArticlesPage() {
  const [rows, setRows] = React.useState<ArticleRow[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState<ArticleDraft>(emptyDraft());
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const loadList = React.useCallback(() => {
    setIsLoading(true);
    adminFetch(`/api/admin/articles`, { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return (await response.json()) as { rows?: ArticleRow[] };
      })
      .then((payload) => setRows(payload.rows || []))
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setIsLoading(false));
  }, []);

  React.useEffect(() => {
    loadList();
  }, [loadList]);

  const openCreate = () => {
    setSelectedId('new');
    setDraft(emptyDraft());
    setError(null);
  };

  const openEdit = async (id: string) => {
    setSelectedId(id);
    setError(null);
    const response = await adminFetch(`/api/admin/articles/${encodeURIComponent(id)}`, { cache: 'no-store' });
    if (!response.ok) {
      setError(`HTTP ${response.status}`);
      return;
    }
    const detail = (await response.json()) as ArticleDetail;
    setDraft(detailToDraft(detail));
  };

  const onStatusChange = (status: string) => {
    setDraft((prev) => {
      const next = { ...prev, status };
      if (status === 'published' && !prev.publishedAt.trim()) {
        next.publishedAt = toDatetimeLocalValue(new Date().toISOString());
      }
      return next;
    });
  };

  const saveDraft = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const isNew = selectedId === 'new';
      let publishedAt = fromDatetimeLocalValue(draft.publishedAt);
      if (draft.status === 'published' && !publishedAt) {
        publishedAt = new Date().toISOString();
      }

      const response = await adminFetch(
        isNew ? `/api/admin/articles` : `/api/admin/articles/${encodeURIComponent(selectedId || '')}`,
        {
          method: isNew ? 'POST' : 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...draft,
            publishedAt,
            canonicalPath: draft.canonicalPath || `/blog/${draft.slug || 'article'}`,
          }),
        },
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const saved = (await response.json()) as ArticleDetail;
      setSelectedId(saved.id);
      setDraft(detailToDraft(saved));
      loadList();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Блог"
        description="Статьи для публичного раздела /blog: просмотр, редактирование и публикация."
        actions={
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Новая статья
          </Button>
        }
      />

      {error ? <Card className="mb-4 border-destructive/30 p-4 text-sm text-destructive">{error}</Card> : null}

      <DataTableShell
        columns={['Статья', 'Дата', 'Статус']}
        loading={isLoading}
        empty={!isLoading && rows.length === 0 ? <div className="p-8 text-sm text-muted-foreground">Статей пока нет.</div> : undefined}
      >
        {rows.map((row) => (
          <tr key={row.id} className="border-b border-border transition hover:bg-muted/40">
            <td className="px-4 py-3">
              <button type="button" onClick={() => openEdit(row.id)} className="text-left">
                <div className="font-medium text-foreground">{row.title}</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  /blog/{row.slug}
                  {row.citySlug ? ` · ${row.citySlug}` : row.city ? ` · ${row.city}` : ''}
                </div>
              </button>
            </td>
            <td className="px-4 py-3 text-sm text-muted-foreground">{row.publishedAt ? formatDateTime(row.publishedAt) : '—'}</td>
            <td className="px-4 py-3">{articleStatusBadge(row.status)}</td>
          </tr>
        ))}
      </DataTableShell>

      <Sheet open={Boolean(selectedId)} onOpenChange={(open) => !open && setSelectedId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          <div className="space-y-4 p-1">
            <h2 className="text-lg font-semibold">{selectedId === 'new' ? 'Новая статья' : 'Редактирование статьи'}</h2>

            <label className="block space-y-1 text-sm">
              <span>Заголовок</span>
              <Input value={draft.title} onChange={(e) => setDraft((prev) => ({ ...prev, title: e.target.value }))} />
            </label>

            <label className="block space-y-1 text-sm">
              <span>ЧПУ (slug)</span>
              <Input value={draft.slug} onChange={(e) => setDraft((prev) => ({ ...prev, slug: e.target.value }))} placeholder="kak-vybrat-koncert" />
            </label>

            <label className="block space-y-1 text-sm">
              <span>Город (citySlug)</span>
              <Input
                value={draft.citySlug}
                onChange={(e) => setDraft((prev) => ({ ...prev, citySlug: e.target.value }))}
                placeholder="saint-petersburg | moscow | multi | regions"
              />
              <span className="text-xs text-muted-foreground">
                Канонический slug для хаба города. Пусто — без CMS-привязки.
              </span>
            </label>

            <label className="block space-y-1 text-sm">
              <span>Статус</span>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={draft.status}
                onChange={(e) => onStatusChange(e.target.value)}
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1 text-sm">
              <span>Дата публикации</span>
              <Input
                type="datetime-local"
                value={draft.publishedAt}
                onChange={(e) => setDraft((prev) => ({ ...prev, publishedAt: e.target.value }))}
              />
              <span className="text-xs text-muted-foreground">
                При статусе «Опубликовано» пустая дата → сейчас; задайте вручную, чтобы разнести даты в блоге.
              </span>
            </label>

            <label className="block space-y-1 text-sm">
              <span>Краткое описание</span>
              <textarea
                className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={draft.excerpt}
                onChange={(e) => setDraft((prev) => ({ ...prev, excerpt: e.target.value }))}
              />
            </label>

            <label className="block space-y-1 text-sm">
              <span>Текст статьи</span>
              <textarea
                className="min-h-56 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
                value={draft.content}
                onChange={(e) => setDraft((prev) => ({ ...prev, content: e.target.value }))}
              />
            </label>

            <label className="block space-y-1 text-sm">
              <span>Обложка (URL)</span>
              <Input value={draft.coverImageUrl} onChange={(e) => setDraft((prev) => ({ ...prev, coverImageUrl: e.target.value }))} />
            </label>

            <label className="block space-y-1 text-sm">
              <span>SEO-заголовок</span>
              <Input value={draft.seoTitle} onChange={(e) => setDraft((prev) => ({ ...prev, seoTitle: e.target.value }))} />
            </label>

            <label className="block space-y-1 text-sm">
              <span>SEO-описание</span>
              <textarea
                className="min-h-16 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={draft.seoDescription}
                onChange={(e) => setDraft((prev) => ({ ...prev, seoDescription: e.target.value }))}
              />
            </label>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={draft.isIndexable}
                onChange={(e) => setDraft((prev) => ({ ...prev, isIndexable: e.target.checked }))}
              />
              Индексировать в поиске
            </label>

            <Button onClick={saveDraft} disabled={isSaving || !draft.title.trim()}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Сохранить
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

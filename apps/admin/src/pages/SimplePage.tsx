import * as React from 'react';
import { adminFetch } from '@/lib/admin-api';
import { Loader2, Save, Search } from 'lucide-react';

import { DataTableShell, PageHeader } from '@/components/admin/primitives';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { adminData, formatNumber } from '@/data';


type AdminDestinationRow = {
  id?: string;
  slug?: string;
  sourceSlug?: string;
  name: string;
  type: 'city' | 'region';
  events: number;
  venues: number;
  cities?: Array<{ name: string; events: number }>;
  categories?: Array<{ name: string; events: number }>;
};

type CitiesPayload = {
  generatedAt: string;
  page?: number;
  pages?: number;
  limit?: number;
  total: number;
  rows: AdminDestinationRow[];
  metrics: {
    destinations: number;
    cities: number;
    regions: number;
    events: number;
    venues: number;
  };
};

type CityDetail = {
  id: string;
  slug: string;
  title: string;
  sourceTitle?: string | null;
  introTitle?: string | null;
  introText?: string | null;
  heroImageUrl?: string | null;
  seoH1?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  canonicalPath?: string | null;
  isDestination: boolean;
  regionId?: string | null;
};

type CityDraft = {
  title: string;
  slug: string;
  sourceTitle: string;
  introTitle: string;
  introText: string;
  heroImageUrl: string;
  seoH1: string;
  seoTitle: string;
  seoDescription: string;
  canonicalPath: string;
  isDestination: boolean;
};

const PAGE_SIZE = 80;

function emptyCityDraft(detail?: CityDetail | null): CityDraft {
  return {
    title: detail?.title || '',
    slug: detail?.slug || '',
    sourceTitle: detail?.sourceTitle || '',
    introTitle: detail?.introTitle || '',
    introText: detail?.introText || '',
    heroImageUrl: detail?.heroImageUrl || '',
    seoH1: detail?.seoH1 || '',
    seoTitle: detail?.seoTitle || '',
    seoDescription: detail?.seoDescription || '',
    canonicalPath: detail?.canonicalPath || '',
    isDestination: detail?.isDestination === true,
  };
}

function normalizeDraftSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/ё/g, 'e')
    .replace(/[^a-z0-9а-я-]+/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

export function SimplePage({ title, description, kind }: { title: string; description: string; kind: 'cities' | 'audit' }) {
  if (kind === 'cities') {
    return <CitiesPage title={title} description={description} />;
  }

  return (
    <div>
      <PageHeader title={title} description={description} />
      <Card className="border-border p-8 text-sm text-muted-foreground">Пока пусто. В MVP появится после подключения ручных правок.</Card>
    </div>
  );
}

function CitiesPage({ title, description }: { title: string; description: string }) {
  const [payload, setPayload] = React.useState<CitiesPayload>(() => buildLocalCitiesPayload());
  const [query, setQuery] = React.useState('');
  const [debouncedQuery, setDebouncedQuery] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [selected, setSelected] = React.useState<AdminDestinationRow | null>(null);
  const [cityDetail, setCityDetail] = React.useState<CityDetail | null>(null);
  const [draft, setDraft] = React.useState<CityDraft>(() => emptyCityDraft());
  const [isDetailLoading, setIsDetailLoading] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  React.useEffect(() => {
    setPage(1);
  }, [debouncedQuery]);

  React.useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      limit: String(PAGE_SIZE),
    });
    if (debouncedQuery) params.set('q', debouncedQuery);

    adminFetch(`/api/admin/cities?${params}`, { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return (await response.json()) as CitiesPayload;
      })
      .then((data) => {
        setPayload(data);
        setLoadError(null);
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setPayload(buildLocalCitiesPayload(debouncedQuery));
        setLoadError(error instanceof Error ? error.message : String(error));
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [page, debouncedQuery]);

  const pages = payload.pages || Math.max(1, Math.ceil((payload.total || 0) / PAGE_SIZE));
  const currentPage = payload.page || page;

  const openCity = async (destination: AdminDestinationRow) => {
    setSelected(destination);
    setCityDetail(null);
    setDraft(emptyCityDraft());
    setSaveError(null);

    if (destination.type !== 'city') {
      setSaveError('Регионы редактируются через связанные города (Prisma Region — только title/slug, отдельный PATCH не подключён).');
      return;
    }

    const cityKey = destination.id || destination.slug || destination.sourceSlug;
    if (!cityKey) {
      setSaveError('Нет id/slug города для загрузки.');
      return;
    }

    setIsDetailLoading(true);
    try {
      const response = await adminFetch(`/api/admin/cities/${encodeURIComponent(cityKey)}`, { cache: 'no-store' });
      const body = (await response.json()) as CityDetail & { error?: string };
      if (!response.ok) throw new Error(body.error || `HTTP ${response.status}`);
      setCityDetail(body);
      setDraft(emptyCityDraft(body));
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsDetailLoading(false);
    }
  };

  const saveCity = async () => {
    if (!cityDetail) return;
    const slug = normalizeDraftSlug(draft.slug);
    if (!draft.title.trim()) {
      setSaveError('Название обязательно.');
      return;
    }
    if (!slug) {
      setSaveError('Slug обязателен.');
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    try {
      const response = await adminFetch(`/api/admin/cities/${encodeURIComponent(cityDetail.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: draft.title.trim(),
          slug,
          sourceTitle: draft.sourceTitle.trim() || null,
          introTitle: draft.introTitle.trim() || null,
          introText: draft.introText.trim() || null,
          heroImageUrl: draft.heroImageUrl.trim() || null,
          seoH1: draft.seoH1.trim() || null,
          seoTitle: draft.seoTitle.trim() || null,
          seoDescription: draft.seoDescription.trim() || null,
          canonicalPath: draft.canonicalPath.trim() || `/cities/${slug}`,
          isDestination: draft.isDestination,
        }),
      });
      const body = (await response.json()) as CityDetail & { error?: string };
      if (!response.ok) {
        if (body.error === 'slug_not_unique') throw new Error('Такой slug уже занят другим городом.');
        throw new Error(body.error || `HTTP ${response.status}`);
      }
      setCityDetail(body);
      setDraft(emptyCityDraft(body));
      setPayload((current) => ({
        ...current,
        rows: current.rows.map((row) =>
          row.id === selected?.id || row.id === cityDetail.id
            ? { ...row, id: body.id, name: body.title, slug: body.slug, sourceSlug: body.slug }
            : row,
        ),
      }));
      setSelected((prev) => (prev ? { ...prev, id: body.id, name: body.title, slug: body.slug, sourceSlug: body.slug } : prev));
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title={title}
        description={`${description} Редактирование карточки City (название, slug, SEO, intro).`}
        meta={
          <>
            <Badge variant="outline">{formatNumber(payload.metrics.cities)} городов</Badge>
            <Badge variant="outline">{formatNumber(payload.metrics.events)} событий</Badge>
            <Badge variant="outline">{formatNumber(payload.metrics.venues)} площадок</Badge>
            {isLoading ? (
              <Badge variant="outline" className="gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                загрузка
              </Badge>
            ) : null}
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-3">
        <div className="relative min-w-[260px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Поиск города или региона..."
            className="h-9 pl-8"
          />
        </div>
        <div className="text-xs text-muted-foreground">{formatNumber(payload.total)} найдено</div>
      </div>

      {loadError ? <div className="mb-4 rounded-lg border border-border bg-surface-muted px-3 py-2 text-xs text-muted-foreground">Резерв API: {loadError}</div> : null}

      <DataTableShell columns={['Тип', 'Название', 'События', 'Площадки', 'Категории / состав', '']}>
        {payload.rows.map((destination) => (
          <tr key={destination.id || `${destination.type}:${destination.name}`} className="border-b border-border last:border-0 hover:bg-secondary/40">
            <td className="px-4 py-3 text-xs uppercase text-muted-foreground">{destination.type === 'city' ? 'город' : 'регион'}</td>
            <td className="min-w-[260px] px-4 py-3">
              <button type="button" className="text-left" onClick={() => openCity(destination)}>
                <div className="font-medium">{destination.name}</div>
                {destination.slug ? <div className="mt-1 font-mono text-[11px] text-muted-foreground">{destination.slug}</div> : null}
              </button>
            </td>
            <td className="px-4 py-3 text-sm">{formatNumber(destination.events)}</td>
            <td className="px-4 py-3 text-sm">{formatNumber(destination.venues)}</td>
            <td className="max-w-[640px] px-4 py-3 text-xs text-muted-foreground">
              <DestinationContext destination={destination} />
            </td>
            <td className="px-4 py-3 text-right">
              <Button type="button" size="sm" variant="outline" onClick={() => openCity(destination)}>
                {destination.type === 'city' ? 'Изменить' : 'Открыть'}
              </Button>
            </td>
          </tr>
        ))}
      </DataTableShell>

      <div className="mt-4 flex items-center justify-end gap-2">
        <Button variant="outline" size="sm" disabled={currentPage <= 1 || isLoading} onClick={() => setPage(currentPage - 1)}>
          Назад
        </Button>
        <div className="text-xs text-muted-foreground">
          {currentPage} / {pages}
        </div>
        <Button variant="outline" size="sm" disabled={currentPage >= pages || isLoading} onClick={() => setPage(currentPage + 1)}>
          Далее
        </Button>
      </div>

      <Sheet open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          <div className="space-y-4 p-1">
            <h2 className="text-lg font-semibold">{selected?.type === 'city' ? 'Редактирование города' : 'Регион'}</h2>
            {selected ? (
              <p className="text-sm text-muted-foreground">
                {selected.name}
                {selected.slug ? ` · /cities/${selected.slug}` : ''}
              </p>
            ) : null}

            {isDetailLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Загрузка…
              </div>
            ) : null}

            {saveError ? <Card className="border-destructive/30 p-3 text-sm text-destructive">{saveError}</Card> : null}

            {cityDetail ? (
              <>
                <label className="block space-y-1 text-sm">
                  <span>Название</span>
                  <Input value={draft.title} onChange={(e) => setDraft((prev) => ({ ...prev, title: e.target.value }))} />
                </label>
                <label className="block space-y-1 text-sm">
                  <span>ЧПУ (slug)</span>
                  <Input value={draft.slug} onChange={(e) => setDraft((prev) => ({ ...prev, slug: e.target.value }))} />
                </label>
                <label className="block space-y-1 text-sm">
                  <span>Исходное название</span>
                  <Input value={draft.sourceTitle} onChange={(e) => setDraft((prev) => ({ ...prev, sourceTitle: e.target.value }))} />
                </label>
                <label className="block space-y-1 text-sm">
                  <span>Intro заголовок</span>
                  <Input value={draft.introTitle} onChange={(e) => setDraft((prev) => ({ ...prev, introTitle: e.target.value }))} />
                </label>
                <label className="block space-y-1 text-sm">
                  <span>Intro текст</span>
                  <textarea
                    className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={draft.introText}
                    onChange={(e) => setDraft((prev) => ({ ...prev, introText: e.target.value }))}
                  />
                </label>
                <label className="block space-y-1 text-sm">
                  <span>Hero image URL</span>
                  <Input value={draft.heroImageUrl} onChange={(e) => setDraft((prev) => ({ ...prev, heroImageUrl: e.target.value }))} />
                </label>
                <label className="block space-y-1 text-sm">
                  <span>SEO H1</span>
                  <Input value={draft.seoH1} onChange={(e) => setDraft((prev) => ({ ...prev, seoH1: e.target.value }))} />
                </label>
                <label className="block space-y-1 text-sm">
                  <span>SEO title</span>
                  <Input value={draft.seoTitle} onChange={(e) => setDraft((prev) => ({ ...prev, seoTitle: e.target.value }))} />
                </label>
                <label className="block space-y-1 text-sm">
                  <span>SEO description</span>
                  <textarea
                    className="min-h-16 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={draft.seoDescription}
                    onChange={(e) => setDraft((prev) => ({ ...prev, seoDescription: e.target.value }))}
                  />
                </label>
                <label className="block space-y-1 text-sm">
                  <span>Canonical path</span>
                  <Input value={draft.canonicalPath} onChange={(e) => setDraft((prev) => ({ ...prev, canonicalPath: e.target.value }))} placeholder="/cities/…" />
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={draft.isDestination}
                    onChange={(e) => setDraft((prev) => ({ ...prev, isDestination: e.target.checked }))}
                  />
                  isDestination (отдельное направление в каталоге)
                </label>
                <Button onClick={saveCity} disabled={isSaving || isDetailLoading || !draft.title.trim()}>
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Сохранить
                </Button>
              </>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function DestinationContext({ destination }: { destination: AdminDestinationRow }) {
  const categories = (destination.categories || []).filter((item) => item.name && item.events > 0);
  if (categories.length) {
    return (
      <div className="flex flex-wrap gap-1.5">
        {categories.map((item) => (
          <Badge key={item.name} variant="outline" className="text-[11px]">
            {item.name}: {formatNumber(item.events)}
          </Badge>
        ))}
      </div>
    );
  }

  if (destination.cities?.length) {
    return <>{destination.cities.map((city) => `${city.name} ${formatNumber(city.events)}`).join(', ')}</>;
  }

  return <>-</>;
}

function buildLocalCitiesPayload(query = ''): CitiesPayload {
  const q = query.trim().toLowerCase();
  const rows = adminData.destinationRows.filter((row) => {
    if (!q) return true;
    return [row.name, row.type].filter(Boolean).join(' ').toLowerCase().includes(q);
  });
  const limit = PAGE_SIZE;
  const total = rows.length;
  const pages = Math.max(1, Math.ceil(total / limit));

  return {
    generatedAt: adminData.generatedAt,
    page: 1,
    pages,
    limit,
    total,
    rows: rows.slice(0, limit),
    metrics: {
      destinations: adminData.destinationRows.length,
      cities: adminData.destinationRows.filter((row) => row.type === 'city').length,
      regions: adminData.destinationRows.filter((row) => row.type === 'region').length,
      events: adminData.destinationRows.reduce((sum, row) => sum + row.events, 0),
      venues: adminData.destinationRows.reduce((sum, row) => sum + row.venues, 0),
    },
  };
}

import * as React from 'react';
import { adminFetch } from '@/lib/admin-api';
import { Loader2, Search } from 'lucide-react';

import { DataTableShell, PageHeader } from '@/components/admin/primitives';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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

const PAGE_SIZE = 80;

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

  return (
    <div>
      <PageHeader
        title={title}
        description={description}
        meta={
          <>
            <Badge variant="outline">{formatNumber(payload.metrics.cities)} городов</Badge>
            <Badge variant="outline">{formatNumber(payload.metrics.events)} событий</Badge>
            <Badge variant="outline">{formatNumber(payload.metrics.venues)} площадок</Badge>
            {isLoading ? (
              <Badge variant="outline" className="gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                backend
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

      {loadError ? <div className="mb-4 rounded-lg border border-border bg-surface-muted px-3 py-2 text-xs text-muted-foreground">Backend fallback: {loadError}</div> : null}

      <DataTableShell columns={['Тип', 'Название', 'События', 'Площадки', 'Категории / состав']}>
        {payload.rows.map((destination) => (
          <tr key={destination.id || `${destination.type}:${destination.name}`} className="border-b border-border last:border-0 hover:bg-secondary/40">
            <td className="px-4 py-3 text-xs uppercase text-muted-foreground">{destination.type === 'city' ? 'город' : 'регион'}</td>
            <td className="min-w-[260px] px-4 py-3">
              <div className="font-medium">{destination.name}</div>
              {destination.slug ? <div className="mt-1 font-mono text-[11px] text-muted-foreground">{destination.slug}</div> : null}
            </td>
            <td className="px-4 py-3 text-sm">{formatNumber(destination.events)}</td>
            <td className="px-4 py-3 text-sm">{formatNumber(destination.venues)}</td>
            <td className="max-w-[640px] px-4 py-3 text-xs text-muted-foreground">
              <DestinationContext destination={destination} />
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

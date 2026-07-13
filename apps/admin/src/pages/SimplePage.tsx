import * as React from 'react';
import { ADMIN_API_BASE } from '@/lib/admin-api';
import { Loader2 } from 'lucide-react';

import { DataTableShell, PageHeader } from '@/components/admin/primitives';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { adminData, formatNumber } from '@/data';

const API_BASE_URL = ADMIN_API_BASE;

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
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);

    fetch(`${API_BASE_URL}/api/admin/cities`, { cache: 'no-store', signal: controller.signal })
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
        setPayload(buildLocalCitiesPayload());
        setLoadError(error instanceof Error ? error.message : String(error));
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, []);

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

function buildLocalCitiesPayload(): CitiesPayload {
  const rows = adminData.destinationRows;

  return {
    generatedAt: adminData.generatedAt,
    total: rows.length,
    rows,
    metrics: {
      destinations: rows.length,
      cities: rows.filter((row) => row.type === 'city').length,
      regions: rows.filter((row) => row.type === 'region').length,
      events: rows.reduce((sum, row) => sum + row.events, 0),
      venues: rows.reduce((sum, row) => sum + row.venues, 0),
    },
  };
}

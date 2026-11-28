import { buildThematicPreviewData, buildThematicPreviewIndex, type PreviewFilters } from '../../new-year-ux-preview/preview-data';
import { InvalidNewYearPreviewQuery, parseNewYearPreviewQuery, parseThematicPreviewQuery } from '@/lib/new-year-preview-query';
import type { PreviewTheme } from '../../new-year-ux-preview/preview-format';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const requestedTheme = params.get('theme');
  const theme: PreviewTheme = requestedTheme === 'concerts-genre' || requestedTheme === 'family-kids' ? requestedTheme : 'new-year';
  if (requestedTheme && theme === 'new-year') return Response.json({ error: 'unknown_thematic_landing' }, { status: 404 });
  if (params.get('index') === '1') {
    try {
      return Response.json(await buildThematicPreviewIndex(theme), {
        headers: { 'Cache-Control': 'no-store' },
      });
    } catch (error) {
      console.error('[new-year-ux-preview] compact index request failed', error);
      return Response.json({ error: 'preview_index_unavailable' }, { status: 503 });
    }
  }
  let filters: PreviewFilters;
  try {
    filters = theme === 'new-year' ? parseNewYearPreviewQuery(params) : parseThematicPreviewQuery(params);
  } catch (error) {
    if (error instanceof InvalidNewYearPreviewQuery) {
      return Response.json({ error: 'invalid_preview_query', detail: error.message }, { status: 400 });
    }
    return Response.json({ error: 'invalid_preview_query' }, { status: 400 });
  }
  try {
    return Response.json(await buildThematicPreviewData(theme, filters), {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('[new-year-ux-preview] catalog data request failed', {
      city: filters.city,
      region: filters.region,
      date: filters.date,
      price: filters.price,
      format: filters.format,
      sort: filters.sort,
      offset: filters.offset,
      error,
    });
    return Response.json({ error: 'preview_data_unavailable' }, { status: 503 });
  }
}

import { buildNewYearPreviewData, buildNewYearPreviewIndex, type PreviewFilters } from '../../new-year-ux-preview/preview-data';
import { InvalidNewYearPreviewQuery, parseNewYearPreviewQuery } from '@/lib/new-year-preview-query';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  if (params.get('index') === '1') {
    try {
      return Response.json(await buildNewYearPreviewIndex(), {
        headers: { 'Cache-Control': 'no-store' },
      });
    } catch (error) {
      console.error('[new-year-ux-preview] compact index request failed', error);
      return Response.json({ error: 'preview_index_unavailable' }, { status: 503 });
    }
  }
  let filters: PreviewFilters;
  try {
    filters = parseNewYearPreviewQuery(params);
  } catch (error) {
    if (error instanceof InvalidNewYearPreviewQuery) {
      return Response.json({ error: 'invalid_preview_query', detail: error.message }, { status: 400 });
    }
    return Response.json({ error: 'invalid_preview_query' }, { status: 400 });
  }
  try {
    return Response.json(await buildNewYearPreviewData(filters), {
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

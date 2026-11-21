import { buildNewYearPreviewData, type PreviewFilters } from '../../new-year-ux-preview/preview-data';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const filters: PreviewFilters = {
    city: params.get('city') || undefined,
    region: params.get('region') || undefined,
    date: params.get('date') || undefined,
    price: params.get('price') || undefined,
    format: params.get('format') || undefined,
    q: params.get('q') || undefined,
    sort: params.get('sort') || undefined,
    lowStock: params.get('lowStock') === '1',
    offset: Number(params.get('offset') || 0),
  };
  try {
    return Response.json(await buildNewYearPreviewData(filters), {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch {
    return Response.json({ error: 'preview_data_unavailable' }, { status: 503 });
  }
}

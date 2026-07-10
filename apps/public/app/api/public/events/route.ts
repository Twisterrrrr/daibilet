import { buildNextPublicCatalog, catalogQueryFromRequest } from '@/server/public-catalog';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    return Response.json(await buildNextPublicCatalog(catalogQueryFromRequest(request)));
  } catch (error) {
    return Response.json(
      {
        error: 'public_catalog_unavailable',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}


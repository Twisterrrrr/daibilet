import { buildNextPublicBuyerOrders } from '@/server/public-buyer-orders';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    return Response.json(await buildNextPublicBuyerOrders(new URL(request.url).searchParams));
  } catch (error) {
    console.error('public_orders_unavailable', error);
    return Response.json(
      {
        error: 'public_orders_unavailable',
        message: 'Не удалось получить данные заказа. Попробуйте позже.',
      },
      { status: 500 },
    );
  }
}

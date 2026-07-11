import { buildNextAccountPurchases } from '@/server/public-buyer-orders';
import { isUnauthorizedError, requireAccountUserFromRequest, unauthorizedErrorDetail } from '@/server/user-token';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const user = await requireAccountUserFromRequest(request);
    return Response.json(await buildNextAccountPurchases(user, new URL(request.url).searchParams));
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return Response.json(
        {
          error: 'account_unauthorized',
          message: unauthorizedErrorDetail(error) || 'Требуется авторизация.',
        },
        { status: 401 },
      );
    }

    console.error('account_purchases_unavailable', error);
    return Response.json(
      {
        error: 'account_purchases_unavailable',
        message: 'Не удалось получить покупки. Попробуйте позже.',
      },
      { status: 500 },
    );
  }
}

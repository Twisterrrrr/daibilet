const ADMIN_ORDER_PATH = /^\/api\/admin\/orders\/([^/]+)$/;

export function getAdminOrderDeleteGuard(method, pathname) {
  if (method !== 'DELETE' || !ADMIN_ORDER_PATH.test(pathname)) return null;

  return {
    statusCode: 403,
    body: {
      error: 'order_delete_disabled',
      message: 'Удаление заказов отключено. Историю заказа нужно сохранять.',
    },
  };
}

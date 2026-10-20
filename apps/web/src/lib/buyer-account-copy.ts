/**
 * Канонические тексты ЛК покупателя («Мои покупки», вход и регистрация).
 *
 * Правила docs/cline-buyer-admin-ui-brief-2026-10-20.md и
 * docs/buyer-admin-bridge-2026-10-20.md:
 * - описываем единый список внешних и внутренних заказов, а не обещание
 *   «только Ticketscloud и Teplohod»;
 * - гостевые покупки по email доступны только после подтверждения адреса;
 * - не утверждаем, что email не подтверждён, пока DTO не дала признак
 *   (см. buyer-email-verification.ts);
 * - без длинного и среднего тире в пользовательских текстах.
 */

import type { BuyerEmailVerificationState } from './buyer-email-verification';

export function buyerAccountHero(email: string): string {
  const account = email.trim() ? ` Аккаунт ${email.trim()}.` : '';
  return `${account} Здесь единый список покупок: заказы Дайбилета и покупки во внешних билетных виджетах организаторов. Покупка через виджет не требует входа.`;
}

export function buyerAccountListLabel(email: string): string {
  const account = email.trim() ? ` ${email.trim()}` : '';
  return `Аккаунт${account}`;
}

export const BUYER_ACCOUNT_EMPTY_HINT =
  'Покупки без входа появятся после подтверждения email аккаунта. Если заказ оформлен на другой адрес, напишите в поддержку - поможем найти его по номеру.';

export const BUYER_ORDERS_EMPTY_TITLE = 'Заказов пока нет';

export function buyerOrdersEmptyBody(lookup: string, state: BuyerEmailVerificationState): string {
  const address = lookup.trim() ? `«${lookup.trim()}»` : '';
  if (state === 'unverified') {
    return `Email ${address} не подтверждён. Отправьте письмо для подтверждения выше, чтобы подключить покупки без входа в аккаунт.`;
  }
  if (state === 'verified') {
    return `Покупки по подтверждённому email ${address} не найдены. Если заказ оформлен на другой адрес или без аккаунта, напишите в поддержку.`;
  }
  return 'В аккаунте пока нет заказов. Подтвердите email, чтобы подключить покупки без входа; если заказ есть на другом адресе, напишите в поддержку.';
}

export const BUYER_LOGIN_INTRO =
  'Вход не обязателен для покупки билета. Войдите или зарегистрируйтесь, чтобы видеть свои заказы Дайбилета в одном списке.';

export const BUYER_REGISTER_INTRO =
  'Регистрация создаёт аккаунт Дайбилета. После подтверждения email здесь появятся и покупки, оформленные на этот адрес без входа.';

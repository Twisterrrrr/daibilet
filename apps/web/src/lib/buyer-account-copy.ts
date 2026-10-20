/**
 * Канонические тексты ЛК покупателя («Мои покупки», вход и регистрация).
 *
 * Правила docs/cline-buyer-admin-ui-brief-2026-10-20.md и
 * docs/buyer-admin-bridge-2026-10-20.md:
 * - описываем единый список внешних и внутренних заказов, а не обещание
 *   «только Ticketscloud и Teplohod»;
 * - не обещаем появление гостевых покупок по email: сервер присоединяет их
 *   только после подтверждения владения адресом;
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
  'Если вы покупали билеты без аккаунта, такие покупки не подтягиваются по email автоматически. Напишите в поддержку - поможем найти заказ по номеру.';

export const BUYER_ORDERS_EMPTY_TITLE = 'Заказов пока нет';

export function buyerOrdersEmptyBody(lookup: string, state: BuyerEmailVerificationState): string {
  const address = lookup.trim() ? `«${lookup.trim()}»` : '';
  if (state === 'unverified') {
    return `Email ${address} не подтверждён, поэтому покупки, оформленные без аккаунта, к аккаунту не подключаются. Если заказ есть, напишите в поддержку - поможем найти его по номеру.`;
  }
  if (state === 'verified') {
    return `Покупки по подтверждённому email ${address} не найдены. Если заказ оформлен на другой адрес или без аккаунта, напишите в поддержку.`;
  }
  return 'В аккаунте пока нет заказов. Покупки, оформленные без аккаунта, по email не подтягиваются автоматически; если заказ есть, напишите в поддержку - найдём по номеру.';
}

export const BUYER_LOGIN_INTRO =
  'Вход не обязателен для покупки билета. Войдите или зарегистрируйтесь, чтобы видеть свои заказы Дайбилета в одном списке.';

export const BUYER_REGISTER_INTRO =
  'Регистрация создаёт аккаунт Дайбилета: заказы, оформленные в аккаунте, появятся в списке «Мои покупки». Покупки без аккаунта по email не подтягиваются.';

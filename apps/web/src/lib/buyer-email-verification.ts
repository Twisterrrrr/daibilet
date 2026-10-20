/**
 * Статус подтверждения email покупателя строго по данным сервера.
 *
 * Правило docs/cline-buyer-admin-ui-brief-2026-10-20.md: ясное пустое состояние
 * для неподтверждённого адреса показывается только после появления признака в
 * DTO. Пока unified buyer DTO (docs/buyer-admin-bridge-2026-10-20.md) не
 * выпускает `account.emailVerified`, статус остаётся `unknown`, и браузер не
 * угадывает его по косвенным данным (наличию строк, тексту ошибки и т.п.).
 */

export type BuyerEmailVerificationState = 'unknown' | 'verified' | 'unverified';

export function resolveBuyerEmailVerification(payload: unknown): BuyerEmailVerificationState {
  if (!payload || typeof payload !== 'object') return 'unknown';
  const account = (payload as { account?: unknown }).account;
  if (!account || typeof account !== 'object') return 'unknown';
  const flag = (account as { emailVerified?: unknown }).emailVerified;
  if (flag === true) return 'verified';
  if (flag === false) return 'unverified';
  return 'unknown';
}

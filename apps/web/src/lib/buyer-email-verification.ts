/**
 * Статус подтверждения email покупателя строго по данным сервера.
 *
 * Правило docs/cline-buyer-admin-ui-brief-2026-10-20.md: ясное пустое состояние
 * для неподтверждённого адреса показывается только после появления признака в
 * DTO. Если старый сервер ещё не отдаёт `account.emailVerified`, статус
 * остаётся `unknown`: браузер не угадывает его по наличию строк или ошибке.
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

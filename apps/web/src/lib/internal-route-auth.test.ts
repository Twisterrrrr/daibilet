import assert from 'node:assert/strict';
import test from 'node:test';

import { isSafeRevalidatePath, timingSafeSecretEqual } from './internal-route-auth.ts';

test('isSafeRevalidatePath allows on-site paths only', () => {
  assert.equal(isSafeRevalidatePath('/events/foo'), true);
  assert.equal(isSafeRevalidatePath('/'), true);
  assert.equal(isSafeRevalidatePath('https://evil.example/x'), false);
  assert.equal(isSafeRevalidatePath('//evil.example'), false);
  assert.equal(isSafeRevalidatePath('/events/../admin'), false);
  assert.equal(isSafeRevalidatePath('\\windows'), false);
});

test('timingSafeSecretEqual rejects mismatches', () => {
  assert.equal(timingSafeSecretEqual('alpha', 'alpha'), true);
  assert.equal(timingSafeSecretEqual('alpha', 'beta'), false);
  assert.equal(timingSafeSecretEqual('', 'secret'), false);
});

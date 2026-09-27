import test from 'node:test';
import assert from 'node:assert/strict';
import { parseAmount, monthKey, money } from '../lib/money.ts';
test('decimal amounts retain exact cents', () => {
  assert.equal(parseAmount('0.29'), 29);
  assert.equal(parseAmount(' 108.1 '), 10810);
  assert.equal(parseAmount('1000000.00'), 100000000);
  assert.equal(money(350025), '$3,500.25');
});
test('reject zero, negative, fractional cents, exponential and excessive amounts', () => {
  for (const invalid of ['0', '-1', '1.001', '1e3', 'Infinity', '', '1000000.01', '$50', '1,000'])
    assert.equal(parseAmount(invalid), null, invalid);
});
test('Sydney month boundaries differ from UTC and respect daylight saving', () => {
  assert.equal(monthKey(new Date('2026-09-30T13:59:59Z')), '2026-09');
  assert.equal(monthKey(new Date('2026-09-30T14:00:00Z')), '2026-10');
  assert.equal(monthKey(new Date('2026-10-31T12:59:59Z')), '2026-10');
  assert.equal(monthKey(new Date('2026-10-31T13:00:00Z')), '2026-11');
});

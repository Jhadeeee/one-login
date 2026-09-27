import { MAX_ENTRY_CENTS } from './money';
import type { EntryInput } from './types';
export const isUuid = (value: unknown): value is string =>
  typeof value === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
export function validateEntry(value: unknown): EntryInput | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  if (!isUuid(v.id) || (v.kind !== 'income' && v.kind !== 'expense')) return null;
  if (
    typeof v.description !== 'string' ||
    !v.description.trim() ||
    v.description.trim().length > 120
  )
    return null;
  if (
    typeof v.amount_cents !== 'number' ||
    !Number.isSafeInteger(v.amount_cents) ||
    v.amount_cents < 1 ||
    v.amount_cents > MAX_ENTRY_CENTS
  )
    return null;
  if (
    v.kind === 'income' &&
    (typeof v.customer !== 'string' || !v.customer.trim() || v.customer.trim().length > 80)
  )
    return null;
  return {
    id: v.id,
    kind: v.kind,
    customer: v.kind === 'income' ? (v.customer as string).trim() : null,
    description: v.description.trim(),
    amount_cents: v.amount_cents,
  };
}

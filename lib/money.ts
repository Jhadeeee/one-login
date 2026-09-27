export const MAX_ENTRY_CENTS = 100_000_000;
const currency = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' });
export function money(cents: number) {
  return currency.format(cents / 100);
}
// Parse decimal strings, never multiply a floating-point dollar amount.
export function parseAmount(value: string): number | null {
  const match = /^(\d{1,7})(?:\.(\d{1,2}))?$/.exec(value.trim());
  if (!match) return null;
  const cents = Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0'));
  return cents > 0 && cents <= MAX_ENTRY_CENTS ? cents : null;
}
export function monthKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-AU', {
    timeZone: 'Australia/Sydney',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(date);
  return `${parts.find((p) => p.type === 'year')!.value}-${parts.find((p) => p.type === 'month')!.value}`;
}
export function entryDate(value: string) {
  return new Intl.DateTimeFormat('en-AU', {
    timeZone: 'Australia/Sydney',
    day: 'numeric',
    month: 'short',
  }).format(new Date(value));
}

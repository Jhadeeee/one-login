import { test, expect, type Page } from '@playwright/test';
import { readFileSync, existsSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

if (existsSync('.env.local')) process.loadEnvFile('.env.local');
const accounts = existsSync('.local/accounts.json')
  ? (JSON.parse(readFileSync('.local/accounts.json', 'utf8').replace(/^\uFEFF/, '')) as {
      role: string;
      email: string;
      password: string;
      id: string;
    }[])
  : [];
const qa = accounts.find((account) => account.role === 'qa') || {
  email: process.env.E2E_EMAIL || '',
  password: process.env.E2E_PASSWORD || '',
};
test.skip(!qa.email || !qa.password, 'Provide a dedicated E2E account.');
async function login(page: Page) {
  await page.goto('/');
  await expect(page).toHaveURL(/\/login/);
  await page.getByLabel('Email', { exact: true }).fill(qa.email);
  await page.getByLabel('Password', { exact: true }).fill(qa.password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'This month' })).toBeVisible();
}
async function job(page: Page, amount = '280') {
  await page.getByRole('button', { name: 'Job done', exact: true }).click();
  await page.getByLabel('Customer', { exact: true }).fill('Alex Taylor');
  await page.getByLabel('Job', { exact: true }).fill('Tap replacement');
  await page.getByRole('textbox', { name: 'Price (AUD)', exact: true }).fill(amount);
}
test.beforeAll(async () => {
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { error } = await client.auth.signInWithPassword(qa);
  if (error) throw error;
  // This is a dedicated test account; keep its live balance empty between runs.
  const { error: cleanup } = await client
    .from('entries')
    .update({ voided_at: new Date().toISOString() })
    .is('voided_at', null);
  if (cleanup) throw cleanup;
});
test('phone: login, instant save, persistence, loss, undo, correction and logout', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await login(page);
  await expect(page.getByText('A fresh start.')).toBeVisible();
  await expect(page.getByTestId('profit')).toHaveText('$0.00');
  await expect(page.getByText('Breaking even')).toBeVisible();
  await job(page, '280.29');
  // Delay the real request so the immediate optimistic result can be observed.
  await page.route('**/api/entries', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await route.continue();
  });
  await page.getByRole('button', { name: 'Save job', exact: true }).click();
  await expect(page.getByTestId('profit')).toHaveText('$280.29');
  await expect(page.getByRole('button', { name: 'Saving…', exact: true })).toBeDisabled();
  await expect(page.getByText('Job saved. $280.29 added.')).toBeVisible();
  await page.unroute('**/api/entries');
  await page.reload();
  await expect(page.getByTestId('profit')).toHaveText('$280.29');
  await page.getByRole('button', { name: 'Add expense', exact: true }).click();
  await page.getByLabel('What was it for?', { exact: true }).fill('Materials');
  await page.getByRole('textbox', { name: 'Amount (AUD)', exact: true }).fill('500');
  await page.getByRole('button', { name: 'Save expense', exact: true }).click();
  await expect(page.getByText('Expense saved. $500.00 added.')).toBeVisible();
  await expect(page.getByTestId('profit')).toHaveText('-$219.71');
  await expect(page.locator('.profit-panel')).toHaveAttribute('data-tone', 'loss');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.getByText('Entry removed. Your numbers are up to date.')).toBeVisible();
  await expect(page.getByTestId('profit')).toHaveText('$280.29');
  await page.getByRole('button', { name: 'View job for Alex Taylor', exact: true }).click();
  await page.getByRole('button', { name: 'Remove entry', exact: true }).click();
  await page.getByRole('button', { name: 'Remove entry', exact: true }).click();
  await expect(page.getByTestId('profit')).toHaveText('$0.00');
  await expect(page.getByText('Entry removed. Your numbers are up to date.')).toBeVisible();
  await page.getByRole('button', { name: 'Account', exact: true }).click();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page).toHaveURL(/\/login/);
  await page.goto('/');
  await expect(page).toHaveURL(/\/login/);
  expect(errors).toEqual([]);
});
test('failed saves restore totals, preserve input, and retry only once', async ({ page }) => {
  await login(page);
  await job(page, '0.29');
  await page.route('**/api/entries', (route) => route.abort('failed'));
  await page.getByRole('button', { name: 'Save job', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Connection interrupted');
  await expect(page.getByTestId('profit')).toHaveText('$0.00');
  await expect(page.getByLabel('Customer', { exact: true })).toHaveValue('Alex Taylor');
  await page.unroute('**/api/entries');
  await page.getByRole('button', { name: 'Save job', exact: true }).click();
  await expect(page.getByText('Job saved. $0.29 added.')).toBeVisible();
  await expect(page.getByTestId('money-in')).toHaveText('$0.29');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.getByText('Entry removed. Your numbers are up to date.')).toBeVisible();
});
test('same request ID is idempotent and invalid amounts are rejected', async ({ page }) => {
  await login(page);
  const result = await page.evaluate(async () => {
    const input = {
      id: crypto.randomUUID(),
      kind: 'income',
      customer: 'Retry customer',
      description: 'Duplicate test',
      amount_cents: 101,
    };
    const post = (data: unknown) =>
      fetch('/api/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    const statuses = await Promise.all([post(input), post(input)]).then((responses) =>
      responses.map((r) => r.status),
    );
    const snapshot = await fetch('/api/dashboard').then((r) => r.json());
    const invalid = await post({ ...input, id: crypto.randomUUID(), amount_cents: 1.1 });
    await fetch(`/api/entries/${input.id}`, { method: 'DELETE' });
    return {
      statuses,
      incoming: snapshot.in_cents,
      count: snapshot.entry_count,
      invalid: invalid.status,
    };
  });
  expect(result).toEqual({ statuses: [200, 200], incoming: 101, count: 1, invalid: 400 });
});
test('layout at narrow phone and desktop sizes; keyboard focus stays in dialog', async ({
  page,
}) => {
  await login(page);
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 950 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: `.local/dashboard-${width}.png`, fullPage: true });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await job(page);
  await page.getByRole('button', { name: 'Save job', exact: true }).focus();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(await page.getByRole('dialog').evaluate((el) => el.contains(document.activeElement))).toBe(
    true,
  );
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
});

# One Login

A small mobile-first app for a trade business: sign in, see this month’s money in, money out and profit, then record a paid job in three fields.

**Live:** [one-login-kappa.vercel.app](https://one-login-kappa.vercel.app)

Built with Next.js App Router, TypeScript, Supabase Auth/Postgres and Vercel. The interface uses a restrained pixel treatment: Silkscreen accents, stepped panels, teal actions and clear financial figures.

## What works

- Email/password sign-in with persistent, HTTP-only session cookies.
- One dashboard after login; forms and account controls open in accessible dialogs.
- Current-month totals in AUD, using Australia/Sydney calendar boundaries.
- Paid jobs, expenses, instant optimistic updates, recoverable errors and idempotent retries.
- Recent activity, Undo and confirmed removal. Removed entries are retained as voided records.
- Positive, negative and break-even states with written labels as well as colour.
- Account isolation enforced in Postgres, including restricted writable columns.

The review account contains clearly labelled fictional data. Its credentials are shared separately. Standard accounts start empty.

## Run locally

Use Node.js 22.13+ (Node 24 recommended).

```sh
npm ci
cp .env.example .env.local
```

Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` for your Supabase project. Its publishable key is intended for application use; table policies enforce access. No service key is required by the application.

Apply `supabase/migrations/202609270001_one_login.sql` to a new Supabase database through the SQL editor or your migration workflow. It creates tables, ownership policies, the account-profile trigger and the monthly aggregation function. Disable public signups for this review-only deployment.

Create confirmed email/password users in Supabase Auth. An account profile is created automatically. Business labels can be set administratively in `profiles`.

```sh
npm run dev
```

Open [localhost:3000](http://localhost:3000).

### Optional sample account

For a new demonstration account, create an ignored `.env.setup.local` file with `SUPABASE_SERVICE_ROLE_KEY`, `REVIEWER_EMAIL` and `REVIEWER_PASSWORD`, then run:

```sh
node scripts/provision-demo.mjs
```

This is an administrative setup script, not application code. Keep the service key local; do not add it to Vercel or Git. The script creates a new user and sample entries once, and does not reset existing users. Normal app visits never reseed or overwrite data.

## Deploy

Import this repository into Vercel as a Next.js project and set the two public Supabase environment variables. Deploy, then set Supabase Auth’s site URL to the resulting production URL. `vercel.json` places server functions in Sydney alongside the database.

The live database uses Supabase’s free plan. Free projects may pause after low activity; verify the live link before a review. Authenticated pages and API responses use private, no-store caching.

## Checks

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

Browser tests use a dedicated account. Set `E2E_EMAIL` and `E2E_PASSWORD`, install Chromium with `npx playwright install chromium`, start the app on port 3100, and run `npm run test:e2e`. Set `TEST_BASE_URL` for a deployed app. If using an installed Google Chrome instead, set `PLAYWRIGHT_CHANNEL=chrome`.

Tests void existing entries in that dedicated test account before running; never point them at a real business account. Browser checks cover login/logout, optimistic feedback, persisted totals, failed-save recovery, duplicate requests, loss/zero states, correction, narrow layouts and dialog focus. Money unit tests cover exact cents, invalid amounts and Sydney month boundaries. The local database verification script additionally checks isolation and the review seed; it requires the ignored local account fixtures.

The interface has been checked at 320px, 390px and desktop widths. The 30-second goal still benefits from a first-time human test on an actual phone.

## Product decisions

**A paid job means money received.** The Job done form explicitly says “Paid job.” It does not treat an unpaid invoice as cash.

**Profit is the brief’s simplified calculation:** recorded payments in minus recorded expenses out. This is a cash-based demonstration, not a complete accrual, GST or tax accounting system.

**One primary action.** Expenses have a secondary action so the outgoings and loss state are functional. The latest three entries provide confirmation without a separate transactions page; expanding shows up to 20 recent entries. Totals include every entry in the current month.

**One source of truth.** Postgres derives totals from entries, with RLS enforced for the signed-in user. Client balances are provisional during a save and reconcile with the server. A UUID is retained across retries to avoid double recording. Authentication is verified again at the data access boundary.

**Deliberately left out:** CRM, quote and invoice builders, unpaid invoices, payment processing, bank feeds, payroll, BAS lodgement, scheduling, teams, charts, subscriptions and offline mode. Those would obscure the main task.

## Project map

```text
app/                     Login, dashboard and HTTP routes
components/              Brand and accessible dialog wrapper
lib/                     Session, validation, money and shared types
supabase/migrations/     Database schema, RLS and monthly aggregation
scripts/                 Optional administrative demonstration setup
tests/                   Money, browser and local database checks
```

Silkscreen is licensed under the SIL Open Font License; its license is included in `public/fonts/OFL-Silkscreen.txt`.

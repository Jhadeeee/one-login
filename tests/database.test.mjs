import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
process.loadEnvFile('.env.local');
const accounts = JSON.parse(readFileSync('.local/accounts.json', 'utf8').replace(/^\uFEFF/, ''));
const make = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
const review = make(),
  qa = make(),
  anon = make();
for (const [client, role] of [
  [review, 'review'],
  [qa, 'qa'],
]) {
  const account = accounts.find((a) => a.role === role);
  const { error } = await client.auth.signInWithPassword({
    email: account.email,
    password: account.password,
  });
  assert.equal(error, null);
}
const reviewId = accounts.find((a) => a.role === 'review').id;
const reviewEntries = await review.from('entries').select('id');
assert.ok(reviewEntries.data.length >= 10);
const foreign = await qa.from('entries').select('*').eq('user_id', reviewId);
assert.deepEqual(foreign.data, []);
const profiles = await qa.from('profiles').select('*').eq('id', reviewId);
assert.deepEqual(profiles.data, []);
const crossUpdate = await qa
  .from('entries')
  .update({ voided_at: new Date().toISOString() })
  .eq('id', reviewEntries.data[0].id)
  .select('id');
assert.deepEqual(crossUpdate.data, []);
const invalidOwner = await qa
  .from('entries')
  .insert({
    id: crypto.randomUUID(),
    user_id: reviewId,
    kind: 'expense',
    description: 'Spoofed',
    amount_cents: 100,
  });
assert.ok(invalidOwner.error);
const changeMoney = await qa
  .from('entries')
  .update({ amount_cents: 500 })
  .eq('id', reviewEntries.data[0].id);
assert.ok(changeMoney.error);
const publicRead = await anon.from('entries').select('*');
assert.ok(publicRead.error);
const publicRpc = await anon.rpc('monthly_snapshot');
assert.ok(publicRpc.error);
const snapshot = await review.rpc('monthly_snapshot');
assert.equal(snapshot.error, null);
assert.equal(snapshot.data.in_cents, 740000);
assert.equal(snapshot.data.out_cents, 418000);
assert.equal(snapshot.data.entry_count, 9);
console.log(
  'Passed: account isolation, owner spoofing denied, protected financial columns, anonymous access denied, current-month sums exclude prior month.',
);

// Run locally with a Supabase service-role/secret key. This key is never needed by the app.
import { existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
if (existsSync('.env.local')) process.loadEnvFile('.env.local');
if (existsSync('.env.setup.local')) process.loadEnvFile('.env.setup.local');
const {
  NEXT_PUBLIC_SUPABASE_URL: url,
  SUPABASE_SERVICE_ROLE_KEY: key,
  REVIEWER_EMAIL: email,
  REVIEWER_PASSWORD: password,
} = process.env;
if (!url || !key || !email || !password || password.length < 12)
  throw new Error(
    'Set the project URL, setup key, reviewer email and a password of at least 12 characters.',
  );
const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const { data, error } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
});
if (error) throw new Error(error.message);
const userId = data.user.id;
const { error: profileError } = await supabase
  .from('profiles')
  .update({ business_name: 'Taylor Trade Co.', is_demo: true })
  .eq('id', userId);
if (profileError) throw profileError;
const samples = [
  ['income', 'Alice Mason', 'Tap replacement', 28000],
  ['expense', null, 'Materials', 18000],
  ['income', 'Liam Power', 'Hot water repair', 48000],
  ['income', 'Sam Wilson', 'Bathroom plumbing', 140000],
  ['expense', null, 'Workshop and vehicle', 118000],
  ['income', 'Casey Lee', 'Kitchen fit-out', 224000],
  ['expense', null, 'Subcontractor payments', 240000],
  ['income', 'Jordan Reid', 'Renovation completion', 300000],
  ['expense', null, 'Fuel and supplies', 42000],
];
// Seed the current instant, so the demonstration always belongs to the current business month.
const occurredAt = new Date().toISOString();
const { error: seedError } = await supabase
  .from('entries')
  .insert(
    samples.map(([kind, customer, description, amount_cents]) => ({
      id: randomUUID(),
      user_id: userId,
      kind,
      customer,
      description,
      amount_cents,
      occurred_at: occurredAt,
    })),
  );
if (seedError) throw seedError;
console.log(
  'Review account created with labelled fictional data. Share its credentials privately.',
);

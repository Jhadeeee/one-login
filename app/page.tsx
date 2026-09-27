import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Dashboard } from './dashboard';
import type { Profile, Snapshot } from '@/lib/types';
export default async function Home() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims.sub) redirect('/login');
  const [snapshot, profile] = await Promise.all([
    supabase.rpc('monthly_snapshot'),
    supabase.from('profiles').select('business_name,is_demo').eq('id', auth.claims.sub).single(),
  ]);
  if (snapshot.error || profile.error) throw new Error('Unable to load your month.');
  return (
    <Dashboard
      initial={snapshot.data as Snapshot}
      profile={profile.data as Profile}
      email={String(auth.claims.email ?? '')}
    />
  );
}

import { authenticatedClient, json } from '@/lib/http';
export async function GET() {
  const supabase = await authenticatedClient();
  if (!supabase) return json({ error: 'Please sign in again.' }, 401);
  const { data, error } = await supabase.rpc('monthly_snapshot');
  return error
    ? json({ error: 'Your numbers could not refresh. Please try again.' }, 503)
    : json(data);
}

import { createClient } from '@/lib/supabase/server';
import { json, sameOrigin } from '@/lib/http';
export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({ error: 'Request not allowed.' }, 403);
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut({ scope: 'local' });
  return error ? json({ error: 'Could not sign out. Please try again.' }, 503) : json({ ok: true });
}

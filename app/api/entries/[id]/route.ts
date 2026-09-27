import { authenticatedClient, json, sameOrigin } from '@/lib/http';
import { isUuid } from '@/lib/validation';
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(request)) return json({ error: 'Request not allowed.' }, 403);
  const { id } = await params;
  if (!isUuid(id)) return json({ error: 'Invalid entry.' }, 400);
  const supabase = await authenticatedClient();
  if (!supabase) return json({ error: 'Please sign in again.' }, 401);
  const { data: entry, error } = await supabase
    .from('entries')
    .update({ voided_at: new Date().toISOString() })
    .eq('id', id)
    .select('id')
    .maybeSingle();
  if (error) return json({ error: 'Could not remove this entry. Please try again.' }, 503);
  if (!entry) return json({ error: 'Entry not found.' }, 404);
  const { data, error: readError } = await supabase.rpc('monthly_snapshot');
  return json({ saved: true, snapshot: readError ? null : data });
}

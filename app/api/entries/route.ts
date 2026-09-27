import { authenticatedClient, json, readJson, sameOrigin } from '@/lib/http';
import { validateEntry } from '@/lib/validation';
export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({ error: 'Request not allowed.' }, 403);
  const supabase = await authenticatedClient();
  if (!supabase) return json({ error: 'Your session ended. Sign in again before saving.' }, 401);
  let input;
  try {
    input = validateEntry(await readJson(request));
  } catch {
    /* Invalid request. */
  }
  if (!input)
    return json(
      { error: 'Check the details and enter an amount between $0.01 and $1,000,000.' },
      400,
    );
  const { error } = await supabase.from('entries').insert(input);
  if (error?.code === '23505') {
    const { data: existing } = await supabase
      .from('entries')
      .select('kind,customer,description,amount_cents,voided_at')
      .eq('id', input.id)
      .maybeSingle();
    if (
      !existing ||
      existing.voided_at ||
      existing.kind !== input.kind ||
      existing.customer !== input.customer ||
      existing.description !== input.description ||
      existing.amount_cents !== input.amount_cents
    )
      return json({ error: 'This entry changed. Close the form and start a new entry.' }, 409);
  } else if (error)
    return json(
      { error: 'We could not save this entry. Your details are still here; please try again.' },
      503,
    );
  const { data, error: readError } = await supabase.rpc('monthly_snapshot');
  // The write succeeded even if the follow-up read fails. Do not invite a second write.
  return json({ saved: true, snapshot: readError ? null : data });
}

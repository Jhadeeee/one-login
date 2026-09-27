import { createClient } from '@/lib/supabase/server';
import { json, readJson, sameOrigin } from '@/lib/http';
export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({ error: 'Please sign in from this app.' }, 403);
  try {
    const body = (await readJson(request)) as Record<string, unknown>;
    if (
      typeof body.email !== 'string' ||
      typeof body.password !== 'string' ||
      body.email.length > 254 ||
      body.password.length > 256
    )
      return json({ error: 'Enter your email and password.' }, 400);
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: body.email.trim(),
      password: body.password,
    });
    if (error)
      return json(
        {
          error:
            error.status === 429
              ? 'Too many attempts. Please try again in a few minutes.'
              : 'That email and password did not match. Please try again.',
        },
        error.status === 429 ? 429 : 401,
      );
    return json({ ok: true });
  } catch {
    return json({ error: 'We could not sign you in. Check your connection and try again.' }, 503);
  }
}

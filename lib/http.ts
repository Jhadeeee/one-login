import { NextResponse } from 'next/server';
import { createClient } from './supabase/server';
export function json(value: unknown, status = 200) {
  return NextResponse.json(value, { status, headers: { 'Cache-Control': 'private, no-store' } });
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  const fetchSite = request.headers.get('sec-fetch-site');
  if (!origin || (fetchSite && fetchSite !== 'same-origin')) return false;
  try {
    // Next.js may reconstruct request.url with an internal hostname behind its proxy.
    // The browser's Host header retains the actual public host (and local dev port).
    const originUrl = new URL(origin);
    const target = new URL(request.url);
    const host = request.headers.get('host') || target.host;
    return (
      ['http:', 'https:'].includes(originUrl.protocol) &&
      originUrl.host === host &&
      originUrl.protocol === target.protocol
    );
  } catch {
    return false;
  }
}
export async function authenticatedClient() {
  const client = await createClient();
  const { data, error } = await client.auth.getClaims();
  return !error && data?.claims.sub ? client : null;
}
export async function readJson(request: Request): Promise<unknown> {
  const raw = await request.text();
  if (raw.length > 8000) throw new Error('Request too large');
  return JSON.parse(raw);
}

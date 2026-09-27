import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Login } from './login';
export default async function LoginPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (data?.claims.sub) redirect('/');
  return <Login />;
}

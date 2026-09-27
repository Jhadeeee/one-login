'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Eye, EyeOff, LoaderCircle } from 'lucide-react';
import { Brand } from '@/components/brand';
export function Login() {
  const router = useRouter();
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.get('email'), password: form.get('password') }),
        signal: AbortSignal.timeout(20000),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      router.replace('/');
      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error &&
          error.name !== 'TimeoutError' &&
          error.message !== 'Failed to fetch'
          ? error.message
          : 'Check your connection and try again.',
      );
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <main className="login-layout">
      <div className="login-brand">
        <Brand />
      </div>
      <section className="login-card">
        <p className="eyebrow">Less admin. More done.</p>
        <h1>
          Your month.
          <br />
          <span>All in one place.</span>
        </h1>
        <p className="login-intro">Sign in. See your numbers. Get back to work.</p>
        <form onSubmit={submit} className="login-form">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            inputMode="email"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="you@yourbusiness.com"
            required
            maxLength={254}
            disabled={busy}
          />
          <label htmlFor="password">Password</label>
          <div className="password-field">
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              maxLength={256}
              disabled={busy}
            />
            <button
              type="button"
              className="icon-button"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
            </button>
          </div>
          {error && (
            <p className="error-message" role="alert">
              {error}
            </p>
          )}
          <button className="primary-button" disabled={busy}>
            {busy ? (
              <>
                <LoaderCircle className="spin" size={20} /> Signing in…
              </>
            ) : (
              <>
                Sign in <ArrowRight size={20} />
              </>
            )}
          </button>
        </form>
        <p className="login-note">Your session stays with you. One less thing to do.</p>
      </section>
      <p className="login-footer pixel">Out-simple them.</p>
    </main>
  );
}

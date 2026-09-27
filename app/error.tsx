'use client';
import { Brand } from '@/components/brand';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="app-shell">
      <header className="app-header">
        <Brand />
      </header>
      <section className="page-error">
        <h1>Let’s try that again.</h1>
        <p>Your month could not load. Check your connection and try again.</p>
        <button className="primary-button" onClick={reset}>
          Try again
        </button>
      </section>
    </main>
  );
}

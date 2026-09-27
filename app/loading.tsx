import { Brand } from '@/components/brand';
export default function Loading() {
  return (
    <main className="app-shell" aria-busy="true" aria-label="Loading your month">
      <header className="app-header">
        <Brand />
      </header>
      <div className="loading-copy">Getting your month ready…</div>
      <div className="skeleton skeleton-profit" />
      <div className="skeleton skeleton-totals" />
      <div className="skeleton skeleton-button" />
    </main>
  );
}

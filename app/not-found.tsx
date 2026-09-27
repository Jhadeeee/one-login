import Link from 'next/link';
import { Brand } from '@/components/brand';
export default function NotFound() {
  return (
    <main className="app-shell">
      <Brand />
      <section className="page-error">
        <h1>Nothing here.</h1>
        <Link href="/" className="primary-button">
          Back to your month
        </Link>
      </section>
    </main>
  );
}

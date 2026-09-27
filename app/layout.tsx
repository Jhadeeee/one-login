import type { Metadata, Viewport } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'One Login — Your month, in the black',
  description: 'Your money in, money out and profit. One screen. Job done.',
  robots: { index: false, follow: false },
  applicationName: 'One Login',
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#F8FAFC' };
export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-AU">
      <body>{children}</body>
    </html>
  );
}

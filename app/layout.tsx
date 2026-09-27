import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import './globals.css';
const pixel = localFont({
  src: '../public/fonts/silkscreen.ttf',
  weight: '400',
  display: 'swap',
  variable: '--font-pixel',
});
export const metadata: Metadata = {
  title: 'One Login — Your month, in the black',
  description: 'Your money in, money out and profit. One screen. Job done.',
  robots: { index: false, follow: false },
  applicationName: 'One Login',
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#F8FAFC' };
export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-AU" className={pixel.variable}>
      <body>{children}</body>
    </html>
  );
}

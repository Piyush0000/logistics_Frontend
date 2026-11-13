import type { Metadata, Viewport } from 'next';
import { Geist_Mono, Plus_Jakarta_Sans } from 'next/font/google';
import type { ReactNode } from 'react';
import { ThemeScript } from '@/components/theme/theme-script';
import { ThemeWatcher } from '@/components/theme/theme-toggle';
import './globals.css';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-jakarta',
  display: 'swap',
});
const geistMono = Geist_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-geist-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Evoc Ships',
  description: 'Shipping control panel for orders, tracking and COD.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#EEF0F5' },
    { media: '(prefers-color-scheme: dark)', color: '#070B16' },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${jakarta.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body>
        <ThemeWatcher />
        {children}
      </body>
    </html>
  );
}

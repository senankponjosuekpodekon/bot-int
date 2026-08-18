import type { Metadata } from 'next';
import './globals.css';
import ToasterProvider from '@/components/ToasterProvider';

export const metadata: Metadata = {
  title: 'Stiamond Agent Platform',
  description: 'Deploy AI agents for your business',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <ToasterProvider />
        {children}
      </body>
    </html>
  );
}

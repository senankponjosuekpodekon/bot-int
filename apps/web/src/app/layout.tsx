import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Stiamond Agent Platform',
  description: 'Deploy AI agents for your business',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

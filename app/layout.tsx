import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Chausse Rep Tool',
  description: 'Rep field tool — Chausse Selections',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased m-0 p-0">
        {children}
      </body>
    </html>
  );
}

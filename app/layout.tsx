import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Панель агронома',
  description: 'Учет картофельных полей, операций и аналитики на Postgres'
};

/**
 * Root layout — minimal shell for ALL routes including /login.
 * Auth checks and the top navigation bar live in app/(app)/layout.tsx.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}

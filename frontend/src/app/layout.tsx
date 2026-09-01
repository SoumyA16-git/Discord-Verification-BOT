import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });

export const metadata: Metadata = {
  title: '911 - Verification BOT | Admin Dashboard',
  description: '911 - Verification BOT: Fast, tamper-proof Discord member verification via OAuth2.',
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%235865F2'><path d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z'/></svg>",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${mono.variable}`}
      style={{ backgroundColor: '#08090d', color: '#f8fafc' }}
      suppressHydrationWarning
    >
      <body
        style={{
          backgroundColor: '#08090d',
          color: '#f8fafc',
          margin: 0,
          padding: 0,
          minHeight: '100vh',
        }}
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}

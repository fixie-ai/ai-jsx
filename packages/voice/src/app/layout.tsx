import { Analytics } from '@vercel/analytics/react';

export const metadata = {
  title: 'Fixie | Voice',
  description: 'Fixie Voice is a platform for building conversational voice AI experiences.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <main className="flex min-h-screen flex-col items-start px-4 lg:px-24 py-6">{children}</main>
        <Analytics />
      </body>
    </html>
  );
}

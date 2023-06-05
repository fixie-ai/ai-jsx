import React from 'react';
import './globals.css';
import NavBar from '@/components/NavBar';

export const metadata = {
  title: 'AI.JSX Demo',
  description: 'A framework for AI-native UIs',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <NavBar />
        <main className="flex min-h-screen flex-col items-start p-24">
          {children}
        </main>
      </body>
    </html>
  );
}

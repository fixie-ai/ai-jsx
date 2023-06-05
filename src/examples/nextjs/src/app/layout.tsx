import React from 'react';
import './globals.css';
import NavBar from '@/components/NavBar';
import InputPrompt from '@/components/InputPrompt';

export const metadata = {
  title: 'AI.JSX Demo',
  description: 'A framework for AI-native UIs',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <NavBar />
        <main className="flex min-h-screen flex-col items-start p-24">{children}</main>
        <div className='hidden'>
          <h1 className='text-2xl'></h1>
          <ul className='list-decimal'>
          </ul>
          <ul className='list-disc'>
          </ul>
        </div>
      </body>
    </html>
  );
}

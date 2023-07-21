import React from 'react';
import './globals.css';
import About from '@/components/About';
import NavBar from '@/components/NavBar';

export const metadata = {
  title: 'AI.JSX + NextJS Demo',
  description: 'A framework for AI-native UIs',
};

const isScreenshare = false;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* This is intentionally a constant value. */}
        {/* eslint-disable-next-line @typescript-eslint/no-unnecessary-condition */}
        {!isScreenshare && (
          <>
            <NavBar />
            <About />
          </>
        )}
        <main className="flex min-h-screen flex-col items-start px-24 py-6">{children}</main>
        <div className="hidden">
          <h1 className="text-2xl"></h1>
          <ul className="list-decimal"></ul>
          <ul className="list-disc"></ul>
        </div>
      </body>
    </html>
  );
}

import React from 'react';
import NavBar from './NavBar.tsx';
import About from './About.tsx';
import { Outlet } from 'react-router-dom';

export const metadata = {
  title: 'AI.JSX React App Demo',
  description: 'A framework for AI-native UIs',
};

export default function RootLayout({ children = <Outlet /> }) {
  return (
    <>
      <NavBar />
      <About />
      <main className="flex min-h-screen flex-col items-start px-24 py-6">{children}</main>
    </>
  );
}

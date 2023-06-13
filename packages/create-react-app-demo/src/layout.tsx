import React from 'react';
import NavBar from './NavBar.tsx';
import { Outlet } from 'react-router-dom';

export const metadata = {
  title: 'AI.JSX + NextJS SSR Demo',
  description: 'A framework for AI-native UIs',
};

export default function RootLayout({ children = <Outlet /> }) {
  return (<>
    <NavBar />
    <main className="flex min-h-screen flex-col items-start p-24">{children}</main>
  </>);
}

'use client';

import React from 'react'
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import classNames from 'classnames';

export default function NavBar() {
  const pathname = usePathname();

  const pages = {
    'Basic Completion': '/basic-completion',
    'JIT UI: Recipe': '/recipe',
    'JIT UI: GitHub Search': '/nl-gh-search',
  };


  return <nav className='bg-slate-100 flex flex-row justify-between p-4'>
    <div className='grow'>
      <h1>AI.JSX Demos</h1>
    </div>
    <div>
      {
        Object.entries(pages).map(([name, href]) => {
          const active = pathname.startsWith(href);
          return <Link key={href} href={href} className={classNames('mr-4 underline', {
            'font-bold': active 
          })}>
            {name}
          </Link>
        })
      }
    </div>
  </nav>
}
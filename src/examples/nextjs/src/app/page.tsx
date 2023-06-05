import React from './react';

export default async function Home() {
  const pages = {
    'Basic Completion': '/basic-completion',
    'Natural Language GitHub Search': '/nl-gh-search',
  }

  return <main className="flex min-h-screen flex-col items-start p-24">
    <h1 className='text-2xl font-bold'>AI.JSX Demos</h1>
    <ul>
      {
        Object.entries(pages).map(([title, href]) => 
          <li className='list-disc' key={href}><a className='underline' href={href}>{title}</a></li>)
      }
    </ul>
  </main>
}
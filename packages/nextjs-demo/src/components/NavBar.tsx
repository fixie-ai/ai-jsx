'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import classNames from 'classnames';

export default function NavBar() {
  const pathname = usePathname();

  const pages = {
    'Basic Completion': '/basic-completion',
    'JIT UI: React': '/recipe',
    'JIT UI: Raw HTML': '/nl-gh-search',
  };

  return (
    <nav className="bg-white shadow">
      <>
        <div className="mx-auto max-w-7xl px-2 sm:px-6 lg:px-8">
          <div className="relative flex h-16 justify-between">
            <div className="absolute inset-y-0 left-0 flex items-center sm:hidden"></div>
            <div className="flex flex-1 items-center justify-center sm:items-stretch sm:justify-start">
              <div className="flex flex-shrink-0 items-center">
                {/* We don't care about the perf for now. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className="block h-6 w-auto lg:hidden"
                  src="https://app.fixie.ai/static/logos/charcoal.png"
                  alt="Fixie Logo"
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className="hidden h-6 w-auto lg:block"
                  src="https://app.fixie.ai/static/logos/charcoal.png"
                  alt="Fixie Logo"
                />
              </div>
              <div className="hidden sm:ml-6 sm:flex justify-center w-full sm:space-x-8">
                {Object.entries(pages).map(([name, href]) => {
                  const active = pathname.startsWith(href);
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={classNames(
                        'inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700',
                        {
                          'border-indigo-500 text-gray-900': active,
                          'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700': !active,
                        }
                      )}
                    >
                      {name}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </>
    </nav>
  );
}

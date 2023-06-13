'use client';

import React from 'react';
import classNames from 'classnames';
import { useLocation } from 'react-router-dom';


export default function NavBar() {
  const { pathname } = useLocation();

  const pages = {
    'Choose your own adventure': '/',
  };

  return (
    <nav className="bg-white shadow">
      <>
        <div className="mx-auto max-w-7xl px-2 sm:px-6 lg:px-8">
          <div className="relative flex h-16 justify-between">
            <div className="absolute inset-y-0 left-0 flex items-center sm:hidden"></div>
            <div className="flex flex-1 items-center justify-center sm:items-stretch sm:justify-start">
              <div className="flex flex-shrink-0 items-center">
                <img
                  className="block h-6 w-auto lg:hidden"
                  src="https://app.fixie.ai/static/logos/charcoal.png"
                  alt="Your Company"
                />
                <img
                  className="hidden h-6 w-auto lg:block"
                  src="https://app.fixie.ai/static/logos/charcoal.png"
                  alt="Your Company"
                />
              </div>
              <div className="hidden sm:ml-6 sm:flex justify-center w-full sm:space-x-8">
                {Object.entries(pages).map(([name, href]) => {
                  const active = pathname.startsWith(href);
                  return (
                    <a
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
                    </a>
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

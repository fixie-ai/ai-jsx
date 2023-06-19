import React from 'react';
import classNames from 'classnames';
import { NavLink } from 'react-router-dom';

export default function NavBar() {
  const pages = {
    'Choose your own adventure': '/',
    'Basic Completion': '/basic-completion',
    'Basic Chat': '/basic-chat',
    'Docs Chat': '/docs-chat',
    'JIT UI: React': '/recipe',
  };

  return (
    <nav className="bg-white shadow">
      <>
        <div className="mx-auto max-w-7xl px-2 sm:px-6 lg:px-8">
          <div className="relative flex h-16 justify-between">
            <div className="absolute inset-y-0 left-0 flex items-center sm:hidden"></div>
            <div className="flex flex-1 items-center justify-center sm:items-stretch sm:justify-start">
              <div className="flex shrink-0 items-center">
                <img
                  className="block h-6 w-auto lg:hidden"
                  src="https://app.fixie.ai/static/logos/charcoal.png"
                  alt="Fixie Logo"
                />
                <img
                  className="hidden h-6 w-auto lg:block"
                  src="https://app.fixie.ai/static/logos/charcoal.png"
                  alt="Fixie Logo"
                />
              </div>
              <div className="hidden w-full justify-center sm:ml-6 sm:flex sm:space-x-8">
                {Object.entries(pages).map(([name, href]) => (
                  <NavLink
                    key={href}
                    to={href}
                    className={({ isActive }) =>
                      classNames(
                        'inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700',
                        {
                          'border-indigo-500 text-gray-900': isActive,
                          'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700': !isActive,
                        }
                      )
                    }
                  >
                    {name}
                  </NavLink>
                ))}
              </div>
            </div>
          </div>
        </div>
      </>
    </nav>
  );
}

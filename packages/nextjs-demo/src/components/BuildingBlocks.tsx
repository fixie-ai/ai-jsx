import { ReactNode } from 'react';
import React from 'react';
import classNames from 'classnames';
import _ from 'lodash';

export function Button({ children, primary }: { children: ReactNode; primary?: boolean }) {
  return (
    <button
      type="button"
      className={classNames(
        'inline-flex items-center gap-x-1.5 rounded-md px-2.5 py-1.5 text-sm font-semibold shadow-sm',
        primary
          ? 'bg-indigo-600 text-white hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'
          : 'bg-white text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50'
      )}
    >
      {children}
    </button>
  );
}

export function IconButton({ children }: { children: ReactNode }) {
  return (
    <button
      type="button"
      className="rounded-full bg-indigo-600 p-1.5 text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
    >
      {children}
    </button>
  );
}

type BackgroundColor = 'gray' | 'red' | 'yellow' | 'green' | 'blue' | 'indigo' | 'purple' | 'pink';
export function Badge({ children, color }: { children: ReactNode; color: BackgroundColor }) {
  function getColorClasses() {
    switch (color) {
      case 'red':
        return 'bg-red-100 text-red-800 ring-red-600/20';
      case 'green':
        return 'bg-green-100 text-green-800 ring-green-600/20';
      case 'yellow':
        return 'bg-yellow-100 text-yellow-800 ring-yellow-600/20';
      case 'blue':
        return 'bg-blue-100 text-blue-800 ring-blue-600/20';
      case 'indigo':
        return 'bg-indigo-100 text-indigo-800 ring-indigo-600/20';
      case 'purple':
        return 'bg-purple-100 text-purple-800 ring-purple-600/20';
      case 'pink':
        return 'bg-pink-100 text-pink-800 ring-pink-600/20';
      case 'gray':
        return 'bg-gray-100 text-gray-800 ring-gray-600/20';
      default:
        throw new Error(`Unrecognized color: ${color}`);
    }
  }
  return (
    <span
      className={classNames(
        'inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset',
        getColorClasses()
      )}
    >
      {children}
    </span>
  );
}

export function ButtonGroup({ labels }: { labels: string[] }) {
  return (
    <span className="isolate inline-flex rounded-md shadow-sm">
      <button
        type="button"
        className="relative inline-flex items-center rounded-l-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-10"
      >
        {labels[0]}
      </button>
      {labels.length > 2 &&
        labels.slice(1, -1).map((label) => (
          <button
            type="button"
            className="relative -ml-px inline-flex items-center bg-white px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-10"
          >
            {label}
          </button>
        ))}

      <button
        type="button"
        className="relative -ml-px inline-flex items-center rounded-r-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-10"
      >
        {_.last(labels)}
      </button>
    </span>
  );
}

export function Card({ children, header, footer }: { children: ReactNode; header?: ReactNode; footer?: ReactNode }) {
  if (header || footer) {
    return (
      <div className="divide-y divide-gray-200 overflow-hidden rounded-lg bg-white shadow">
        {header && <div className="px-4 py-5 sm:px-6">{header}</div>}

        <div className="px-4 py-5 sm:p-6">{children}</div>
        {footer && <div className="px-4 py-4 sm:px-6">{footer}</div>}
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-lg bg-white shadow">
      <div className="px-4 py-5 sm:p-6">{children}</div>
    </div>
  );
}

export function CardList({ children }: { children: ReactNode[] }) {
  return (
    <ul role="list" className="space-y-3">
      {React.Children.map(children, (child, index) => (
        <li key={index} className="overflow-hidden rounded-md bg-white px-6 py-4 shadow">
          {child}
        </li>
      ))}
    </ul>
  );
}

// TODO: What's the best way to give the UI icons? Maybe stick to emojis for now?

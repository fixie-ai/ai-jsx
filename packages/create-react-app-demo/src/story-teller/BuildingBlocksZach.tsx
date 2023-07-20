'use client';

import { ReactNode } from 'react';

/**
 * Use this to display collected information to the user. The children can be markdown.
 *
 * Only use the card if you have a logically-grouped set of information to show the user, in the context of a larger response. Generally, your entire response should not be a card.
 *
 * @example
 *  Here's the best candidate I found:
 *  <Card header='Sam Smith'>
 *    **Skills**: React, TypeScript, Node.js
 *    **Location**: Seattle, WA
 *    **Years of experience**: 5
 *    **Availability**: Full-time
 *  </Card>
 *
 * @example
 *  <Card header='Your Ferry Booking' footer='Reservation held for 20 minutes'>
 *   **Leaves** at 4:15p and **arrives** at 6:20p.
 *  </Card>
 *
 * @example (using with surrounding markdown)
 *  Sure, I'd be happy to help you find a car wash. Here are some options:
 *
 *  <Card header='AutoWorld'>
 *   $50 for a quick car wash.
 *  </Card>
 *  <Card header='Big Joel Big Trucks'>
 *   $155 for a detailing
 *  </Card>
 *  <Card header='Small Joel Small Trucks'>
 *   $10 for some guy to spray your car with a hose.
 *  </Card>
 */
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

/**
 * Use this when the user needs to make a choice.
 *
 * @example
 *  <ButtonGroup labels={['Yes', 'No']} />
 *
 * @example (with surrounding markdown)
 *  The system is configured. How would you like to proceed?
 *  <ButtonGroup labels={['Deploy to prod', 'Deploy to staging', 'Cancel']} />
 */
export function ButtonGroup({ labels }: { labels: string[] }) {
  // Handle partial rendering
  if (!labels) {
    return;
  }

  return (
    <span className="isolate inline-flex rounded-md shadow-sm">
      <button
        type="button"
        className="relative inline-flex items-center rounded-l-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-10"
      >
        {labels[0]}
      </button>
      {labels.length > 2 &&
        labels.slice(1, -1).map((label, index) => (
          <button
            key={index}
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

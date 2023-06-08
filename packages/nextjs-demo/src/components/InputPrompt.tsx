'use client';

/* eslint-env browser */

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

export default function InputPrompt({ label, defaultValue }: { label: string; defaultValue: string }) {
  const searchParams = useSearchParams();
  const q = searchParams.get('q') ?? defaultValue;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const q = (formData.get('topic') as string).trim();
    window.location.href = `${window.location.pathname}?q=${encodeURIComponent(q)}`;
  }

  return (
    <Suspense>
      <div className="max-w-7xl min-w-full">
        <form className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl md:col-span-2" onSubmit={handleSubmit}>
          <div className="px-4 py-6 sm:p-8">
            <div className="grid max-w-2xl grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
              <div className="col-span-full">
                <label htmlFor="topic" className="block text-sm font-medium leading-6 text-gray-900">
                  {label}
                </label>
                <div className="mt-2">
                  <textarea
                    id="topic"
                    name="topic"
                    rows={3}
                    className="block w-full rounded-md border-0 p-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                    defaultValue={q}
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-end gap-x-6 border-t border-gray-900/10 px-4 py-4 sm:px-8">
            <button
              type="submit"
              className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              Submit
            </button>
          </div>
        </form>
      </div>
    </Suspense>
  );
}

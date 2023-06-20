'use client';

/* eslint-env browser */

import React, { Suspense } from 'react';

export default function InputPrompt({ label, defaultValue }: { label: string; defaultValue: string }) {
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const q = (formData.get('message') as string).trim();
    window.location.href = `${window.location.pathname}?q=${encodeURIComponent(q)}`;
  }

  return (
    <Suspense>
      <div className="min-w-full max-w-7xl pb-8">
        <form className="mt-4 flex w-full" onSubmit={handleSubmit}>
          <input
            type="text"
            name="message"
            placeholder={label}
            defaultValue={defaultValue}
            className="w-full rounded-md border-0 p-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-fixie-fresh-salmon sm:text-sm sm:leading-6"
          />
          <button
            type="submit"
            className="ml-4 rounded-md bg-fixie-fresh-salmon px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-fixie-ripe-salmon focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fixie-fresh-salmon"
          >
            Submit
          </button>
        </form>
      </div>
    </Suspense>
  );
}

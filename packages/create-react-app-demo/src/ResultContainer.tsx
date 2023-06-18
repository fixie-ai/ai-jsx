import React from 'react';

export default function ResultContainer({
  title,
  children,
  description,
}: {
  title: string;
  children: React.ReactNode;
  description?: React.ReactNode;
}) {
  return (
    <div className="min-w-full max-w-7xl py-6">
      <div className="min-w-full max-w-none">
        <div className="overflow-hidden bg-white sm:rounded-lg sm:shadow">
          <div className="border-b border-gray-200 bg-white px-4 py-5 sm:px-6">
            <h3 className="text-base font-semibold leading-6 text-gray-900">{title}</h3>
            <p>{description}</p>
          </div>
          <div className="whitespace-pre-wrap bg-white px-4 py-5 sm:px-6">{children}</div>
        </div>
      </div>
    </div>
  );
}

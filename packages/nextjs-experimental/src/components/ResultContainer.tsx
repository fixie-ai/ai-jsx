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
    <div className="max-w-7xl min-w-full">
      <div className="max-w-none min-w-full">
        <div className="overflow-hidden bg-white sm:rounded-lg sm:shadow">
          <div className="border-b border-gray-200 bg-white px-4 py-5 sm:px-6">
            <h3 className="text-base font-semibold leading-6 text-gray-900">{title}</h3>
            <p>{description}</p>
          </div>
          <div className="bg-white px-4 py-5 sm:px-6 whitespace-pre-wrap">{children}</div>
        </div>
      </div>
    </div>
  );
}

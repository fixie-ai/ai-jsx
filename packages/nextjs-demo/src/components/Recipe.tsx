'use client';

import { useAIStream } from 'ai-jsx/react';
import React, { useState, useEffect } from 'react';
import RecipeMap from '@/components/Recipe.map';
import Image from 'next/image';
import _ from 'lodash';
import { BookmarkIcon, ShareIcon } from '@heroicons/react/20/solid';

export function Recipe({ children }: { children: React.ReactNode }) {
  const [title, notTitle] = _.partition(
    React.Children.toArray(children),
    (child) =>
      typeof child === 'object' &&
      'type' in child &&
      typeof child.type !== 'string' &&
      child.type.name === 'RecipeTitle'
  );

  const cardHeading = (
    <div className="-ml-4 -mt-2 flex flex-wrap items-center justify-between sm:flex-nowrap">
      <div className="ml-4 mt-2">{title[0]}</div>
      <div className="ml-4 mt-4 flex flex-shrink-0">
        <button
          type="button"
          className="relative inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
        >
          <BookmarkIcon className="-ml-0.5 mr-1.5 h-5 w-5 text-gray-400" aria-hidden="true" />
          <span>Save</span>
        </button>
        <button
          type="button"
          className="relative ml-3 inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
        >
          <ShareIcon className="-ml-0.5 mr-1.5 h-5 w-5 text-gray-400" aria-hidden="true" />
          <span>Share</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="divide-y divide-gray-200 overflow-hidden rounded-lg bg-white shadow">
      <div className="px-4 py-5 sm:px-6">{cardHeading}</div>
      <div className="px-4 py-5 sm:p-6">{notTitle}</div>
    </div>
  );
}

export function RecipeTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-base font-semibold leading-6 text-gray-900">{children}</h3>;
}

export function RecipeInstructionList({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4">
      <h2>Instructions</h2>
      <ol className="list-disc list-inside" data-test="recipe-instruction-list">
        {children}
      </ol>
    </div>
  );
}

export function RecipeIngredientList({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <h2 className="italics">Ingredients</h2>
      <ul className="list-inside italic" data-test="recipe-ingredient-list">
        {children}
      </ul>
      <SelectIngredientsButton />
    </div>
  );
}

export function SelectIngredientsButton() {
  return (
    <button
      data-test="select-ingredients-button"
      className="mt-2 rounded bg-fixie-fresh-salmon px-2 py-1 text-sm font-semibold text-white shadow-sm hover:bg-fixie-ripe-salmon focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fixie-fresh-salmon"
    >
      Add selected ingredients to shopping list
    </button>
  );
}

export function RecipeIngredientListItem({ children }: { children: React.ReactNode }) {
  return (
    <li data-test="recipe-ingredient-list-item">
      <input type="checkbox" className="mr-2" />
      {children}
    </li>
  );
}

export function RecipeInstructionListItem({ children }: { children: React.ReactNode }) {
  return <li data-test="recipe-instruction-list-item">{children}</li>;
}

export function RecipeGenerator({ topic }: { topic: string }) {
  const [isLoading, setIsLoading] = useState(false);
  const { current, fetchAI } = useAIStream({
    componentMap: RecipeMap,
    onComplete: (x) => {
      setIsLoading(false);
      return x;
    },
  });

  useEffect(() => {
    setIsLoading(true);
    fetchAI('/recipe/api', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic }),
    });
  }, [topic]);

  return (
    <div>
      <div className="whitespace-pre-line">{current}</div>
      <div className="mt-4">
        {isLoading && <Image src="/loading.gif" alt="loading spiner" width={20} height={20} />}
      </div>
    </div>
  );
}

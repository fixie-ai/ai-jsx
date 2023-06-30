'use client';

import { useAIStream } from 'ai-jsx/react';
import React, { useState, useEffect, SetStateAction, Dispatch } from 'react';
import RecipeMap from '@/components/Recipe.map';
import Image from 'next/image';
import { BookmarkIcon, ShareIcon } from '@heroicons/react/20/solid';
// @ts-ignore
import { Tab } from '@headlessui/react';
import classNames from 'classnames';

function TabItem({ children }: { children: React.ReactNode }) {
  return (
    <Tab>
      {({ selected }) => (
        <button
          className={classNames(
            selected ? 'bg-gray-200 text-gray-800' : 'text-gray-600 hover:text-gray-800',
            'rounded-md px-3 py-2 text-sm font-medium'
          )}
        >
          {children}
        </button>
      )}
    </Tab>
  );
}

export function Recipe({ children }: { children: React.ReactNode }) {
  function findChildWithType(type: string) {
    return React.Children.toArray(children).find(
      (child) =>
        typeof child === 'object' && 'type' in child && typeof child.type !== 'string' && child.type.name === type
    );
  }

  const title = findChildWithType('RecipeTitle');
  const ingredients = findChildWithType('RecipeIngredientList');
  const instructions = findChildWithType('RecipeInstructionList');

  const cardHeading = (
    <div className="-ml-4 -mt-2 flex flex-wrap items-center justify-between sm:flex-nowrap">
      <div className="ml-4 mt-2">{title}</div>
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
    <div className="divide-y divide-gray-200 overflow-hidden rounded-lg bg-fixie-light-dust shadow-2xl mt-4">
      <div className="px-4 py-5 sm:px-6">{cardHeading}</div>
      <div className="px-4 py-5 sm:p-6">
        <Tab.Group>
          <Tab.List as="nav" className="flex space-x-4 mb-4">
            {['Ingredients', 'Recipe'].map((item) => (
              <TabItem>{item}</TabItem>
            ))}
          </Tab.List>
          <Tab.Panels>
            <Tab.Panel>{ingredients}</Tab.Panel>
            <Tab.Panel>{instructions}</Tab.Panel>
          </Tab.Panels>
        </Tab.Group>
      </div>
    </div>
  );
}

export function RecipeTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-base font-semibold leading-6 text-gray-900">{children}</h3>;
}

export function RecipeInstructionList({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4">
      <ol className="list-decimal list-inside" data-test="recipe-instruction-list">
        {children}
      </ol>
    </div>
  );
}

const SetCountSelectedContext = React.createContext<Dispatch<SetStateAction<number>> | null>(null);
const useSetCountSelected = () => React.useContext(SetCountSelectedContext);
export function RecipeIngredientList({ children }: { children: React.ReactNode }) {
  const [countSelected, setCountSelected] = useState(0);
  return (
    <div>
      <ul className="list-inside italic" data-test="recipe-ingredient-list">
        <SetCountSelectedContext.Provider value={setCountSelected}>{children}</SetCountSelectedContext.Provider>
      </ul>
      <SelectIngredientsButton countSelected={countSelected} />
    </div>
  );
}

export function SelectIngredientsButton({ countSelected }: { countSelected: number }) {
  const disabled = countSelected === 0;
  return (
    <button
      disabled={disabled}
      data-test="select-ingredients-button"
      className={classNames(
        'mt-2 rounded  px-2 py-1 text-sm font-semibold text-white shadow-sm  focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fixie-fresh-salmon',
        {
          'cursor-not-allowed bg-fixie-dark-gray': disabled,
          'hover:bg-fixie-ripe-salmon bg-fixie-fresh-salmon': !disabled,
        }
      )}
    >
      Add {countSelected ? `${countSelected} ` : ' '}selected ingredients to shopping list
    </button>
  );
}

export function RecipeIngredientListItem({ children }: { children: React.ReactNode }) {
  const [isSelected, setIsSelected] = useState(false);
  const setCountSelected = useSetCountSelected();
  return (
    <li
      data-test="recipe-ingredient-list-item"
      onClick={() => {
        setIsSelected((selected) => !selected);
        // This is probably breaking all sorts of React rules.
        // It's probably be more stable to have a Set and ids for each ingredient.
        setCountSelected?.((countSelected) => countSelected + (isSelected ? -1 : 1));
      }}
    >
      <input type="checkbox" className="mr-2" checked={isSelected} />
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

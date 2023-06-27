'use client';

import { useAIStream } from 'ai-jsx/react';
import React, { useState, useEffect } from 'react';
import RecipeMap from '@/components/Recipe.map';

export function Recipe({ children }: { children: React.ReactNode }) {
  return <div data-test="recipe">{children}</div>;
}

export function RecipeTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xl font-bold" data-test="recipe-title">
      {children}
    </h2>
  );
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
      <ul className="list-disc list-inside italic" data-test="recipe-ingredient-list">
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
  const [activeTopic, setActiveTopic] = useState(null as string | null);
  const [isLoading, setIsLoading] = useState(false);
  const { current, fetchAI } = useAIStream({
    componentMap: RecipeMap,
    onComplete: (x) => {
      setIsLoading(false);
      return x;
    },
  });

  useEffect(() => {
    setActiveTopic(topic);
    setIsLoading(true);
    fetchAI('/recipe/api', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic }),
    });
  }, [topic]);

  return <div className="whitespace-pre-line">{isLoading ? 'Loading...' : current}</div>;
}

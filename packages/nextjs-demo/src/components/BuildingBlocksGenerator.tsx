'use client';

import { useAIStream } from 'ai-jsx/react';
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import BuildingBlocksMap from './BuildingBlocks.map';

export default function BuildingBlockGenerator({ topic }: { topic: string }) {
  const [isLoading, setIsLoading] = useState(false);
  const { current, fetchAI } = useAIStream({
    componentMap: BuildingBlocksMap,
    onComplete: (x) => {
      setIsLoading(false);
      return x;
    },
  });

  useEffect(() => {
    setIsLoading(true);
    fetchAI('/building-blocks/api', {
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

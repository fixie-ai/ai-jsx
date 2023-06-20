/** @jsxImportSource ai-jsx/react */
import * as AI from 'ai-jsx/react';
import { UseOpenAIProxy } from 'ai-jsx/lib/openai';

export function UseHostOpenAIProxy({ children }: { children: AI.Node }) {
  return <UseOpenAIProxy basePath="/v1">{children}</UseOpenAIProxy>;
}

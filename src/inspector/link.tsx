/**
 * Adapted from https://github.com/sindresorhus/ink-link.
 */

import { LLMx } from '../lib/index.ts';
import terminalLink from 'terminal-link';
import { ReactNode } from 'react';
import { Text, Transform } from 'ink';

export default function Link(props: { children: ReactNode; url: string }) {
  return (
    <Transform react transform={(children) => terminalLink(children, props.url)}>
      <Text react>{props.children}</Text>
    </Transform>
  );
}

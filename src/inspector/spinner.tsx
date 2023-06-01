/**
 * Adapted from https://github.com/vadimdemedes/ink-spinner
 */

import { LLMx } from '../lib/index.ts';
import { useState, useEffect } from 'react';
import { Text } from 'ink';
import spinners from 'cli-spinners';
import type { SpinnerName } from 'cli-spinners';

export type Props = {
  /**
   * Type of a spinner.
   * See [cli-spinners](https://github.com/sindresorhus/cli-spinners) for available spinners.
   *
   * @default dots
   */
  type?: SpinnerName;
};

/**
 * Spinner.
 */
function Spinner({ type = 'dots' }: Props) {
  const [frame, setFrame] = useState(0);
  const spinner = spinners[type];

  useEffect(() => {
    const timer = setInterval(() => {
      setFrame((previousFrame) => {
        const isLastFrame = previousFrame === spinner.frames.length - 1;
        return isLastFrame ? 0 : previousFrame + 1;
      });
    }, spinner.interval);

    return () => {
      clearInterval(timer);
    };
  }, [spinner]);

  return <Text react>{spinner.frames[frame]}</Text>;
}

export default Spinner;

import * as AI from 'ai-jsx';
import { Completion } from 'ai-jsx/core/completion';
import { Inline, __ } from 'ai-jsx/core/inline';
import { Node, RenderContext } from 'ai-jsx';
import { showJSX } from './utils.js';

const Temperature = AI.createContext(0.0);

function CharacterGenerator(props: Record<string, never>, { getContext }: RenderContext) {
  function JsonStringCompletion({ children }: { children: Node }) {
    return (
      <Completion stop={['"']} temperature={getContext(Temperature)}>
        {children}
      </Completion>
    );
  }

  return (
    <Inline>
      The following is a character profile for an RPG game in JSON format:{'\n'}
      {'{'}
      {'\n  '}"class": "{__(JsonStringCompletion)}",
      {'\n  '}"name": "{__(JsonStringCompletion)}",
      {'\n  '}"mantra": "{__(JsonStringCompletion)}"{'\n'}
      {'}'}
    </Inline>
  );
}

showJSX(
  <>
    <Temperature.Provider value={0.0}>
      🥶🥶🥶:{'\n'}
      <CharacterGenerator />
    </Temperature.Provider>
    {'\n'}
    <Temperature.Provider value={0.5}>
      Warmer:{'\n'}
      <CharacterGenerator />
    </Temperature.Provider>
    {'\n'}
    <Temperature.Provider value={1.0}>
      WARMER:{'\n'}
      <CharacterGenerator />
    </Temperature.Provider>
    {'\n'}
    <Temperature.Provider value={1.5}>
      HOT:{'\n'}
      <CharacterGenerator />
    </Temperature.Provider>
    {'\n'}
    <Temperature.Provider value={2.0}>
      🔥🔥🔥:{'\n'}
      <CharacterGenerator />
    </Temperature.Provider>
  </>
);

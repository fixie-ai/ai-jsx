import { showInspector } from 'ai-jsx/core/inspector';
import * as LLMx from 'ai-jsx';
import { Completion } from 'ai-jsx/core/completion';
import { Inline } from 'ai-jsx/core/inline';
import { Node, RenderContext } from 'ai-jsx';

const Temperature = LLMx.createContext(0.0);

function CharacterGenerator(props: Record<string, never>, { getContext }: RenderContext) {
  const inlineCompletion = (prompt: Node) => (
    <Completion stop={['"']} temperature={getContext(Temperature)}>
      {prompt}
    </Completion>
  );

  return (
    <Inline>
      The following is a character profile for an RPG game in JSON format:{'\n'}
      {'{'}
      {'\n  '}"class": "{inlineCompletion}",
      {'\n  '}"name": "{inlineCompletion}",
      {'\n  '}"mantra": "{inlineCompletion}"{'\n'}
      {'}'}
    </Inline>
  );
}

showInspector(
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

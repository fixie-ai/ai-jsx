import { showInspector } from '../inspector/console.tsx';
import { LLMx } from '../lib/index.ts';
import { Completion } from '../lib/completion-components.tsx';
import { Inline } from '../lib/inline.tsx';

const Temperature = LLMx.createContext(0.0);

function CharacterGenerator(props: Record<string, never>, { getContext }: LLMx.RenderContext) {
  const inlineCompletion = (prompt: LLMx.Node) => (
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

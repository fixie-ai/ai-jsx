import { showInspector } from '../inspector/console.tsx';
import { LLMx } from '../lib/index.ts';
import { Completion } from '../lib/completion-components.tsx';
import { Inline, Scope } from '../lib/inline.tsx';

const Temperature = LLMx.createContext(0.0);

function CharacterGenerator(_: {}, { getContext }: LLMx.RenderContext) {
  // Note that this is a contrived example because we have to go out of our way not
  // to just add a prop. But it demonstrates avoiding prop drilling.
  const inlineCompletion = (
    <Inline>
      {(prompt) => (
        <Completion temperature={getContext(Temperature)} stop={['"']}>
          {prompt}
        </Completion>
      )}
    </Inline>
  );

  return (
    <Scope>
      The following is a character profile for an RPG game in JSON format:{'\n'}
      {'{'}
      {'\n  '}"class": "{inlineCompletion}",
      {'\n  '}"name": "{inlineCompletion}",
      {'\n  '}"mantra": "{inlineCompletion}"{'\n'}
      {'}'}
    </Scope>
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

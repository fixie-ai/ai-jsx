import { UserMessage } from 'ai-jsx/core/completion';
import { JsonChatCompletion, YamlChatCompletion } from 'ai-jsx/batteries/constrained-output';
import z from 'zod';
import { showJSX } from './utils.js';

const FamilyTree: z.Schema = z.array(
  z.object({
    name: z.string(),
    children: z.lazy(() => FamilyTree).optional(),
  })
);

const RootFamilyTree: z.ZodObject<any> = z.object({
  tree: FamilyTree,
});

function App() {
  const query = 'Create a nested family tree with names and ages. It should include a total of 5 people.';
  return (
    <>
      JSON generation example:{'\n'}
      <JsonChatCompletion schema={RootFamilyTree}>
        <UserMessage>{query}</UserMessage>
      </JsonChatCompletion>
      {'\n\n'}
      YAML generation example:{'\n'}
      <YamlChatCompletion schema={RootFamilyTree}>
        <UserMessage>{query}</UserMessage>
      </YamlChatCompletion>
    </>
  );
}

showJSX(<App />);

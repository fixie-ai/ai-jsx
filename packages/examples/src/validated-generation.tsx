import { UserMessage } from 'ai-jsx/core/completion';
import { JsonChatCompletion, YamlChatCompletion } from 'ai-jsx/batteries/constrained-output';
import { showInspector } from 'ai-jsx/core/inspector';
import z from 'zod';
import { Anthropic } from 'ai-jsx/lib/anthropic';

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
      <Anthropic chatModel="claude-1.3">
        <JsonChatCompletion schema={RootFamilyTree}>
          <UserMessage>{query}</UserMessage>
        </JsonChatCompletion>
      </Anthropic>
      {'\n\n'}
      YAML generation example:{'\n'}
      <YamlChatCompletion schema={RootFamilyTree}>
        <UserMessage>{query}</UserMessage>
      </YamlChatCompletion>
    </>
  );
}

showInspector(<App />);

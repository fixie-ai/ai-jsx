import { UserMessage } from 'ai-jsx/core/completion';
import { JsonChatCompletion, YamlChatCompletion } from 'ai-jsx/batteries/constrained-output';
import { showInspector } from 'ai-jsx/core/inspector';
import z from 'zod';

const FamilyTree: z.Schema = z.array(
  z.object({
    name: z.string(),
    children: z.lazy(() => FamilyTree).optional(),
  })
);

const RootFamilyTree: z.Schema = z.object({
  tree: FamilyTree,
});

async function App(props: any, { render }: any) {
  const query = 'Create a nested family tree with names and ages. It should include a total of 5 people.';
  const json = await render(
    <JsonChatCompletion schema={RootFamilyTree}>
      <UserMessage>{query}</UserMessage>
    </JsonChatCompletion>
  );
  return (
    <>
      JSON generation example:{'\n'}
      {JSON.parse(json)}
      {json}
      {'\n\n'}
      YAML generation example:{'\n'}
      <YamlChatCompletion schema={FamilyTree}>
        <UserMessage>{query}</UserMessage>
      </YamlChatCompletion>
    </>
  );
}

showInspector(<App />);

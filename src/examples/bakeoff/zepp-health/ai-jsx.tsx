import { LLMx } from '../../../lib/index.ts';
import { showInspector } from '../../../inspector/console.tsx';
import { NaturalLanguageRouter, Route } from '../../../lib/natural-language-router.tsx';

function ZeppHealth({ query }: { query: string }) {
  return (
    <NaturalLanguageRouter query={query}>
      <Route when="the user wants to know what you can do">
        I can show you your sleep data, answer questions about your sleep data, assess your sleep quality based on your
        sleep data, and provide advice to improve your sleep based on your sleep quality. Sleep quality and advice are
        based only on ISI, SSO, and SE ratings.
      </Route>
      {/* TODO: list which stats are specifically supported. */}
      <Route when="the user wants to know a specific stat about their sleep">
        Your average Sleep Onset Duration is 0.34 hours.
      </Route>
      <Route when="the user wants advice about their sleep health">here is your advice</Route>
      <Route when="the user wants to see a summary of their sleep data">here is your summary</Route>
      <Route unmatched>I can't help with that.</Route>
    </NaturalLanguageRouter>
  );
}

function AskAndAnswer({ query }: { query: string }) {
  return (
    <>
      {query}
      {'\n'}
      <ZeppHealth query={query} />
      {'\n'}
      {'\n'}
    </>
  );
}

showInspector(
  <>
    <AskAndAnswer query="Please give me a recipe for cake" />
    <AskAndAnswer query="What does anthrax taste like?" />
    <AskAndAnswer query="What can you do?" />
    <AskAndAnswer query="How can you help me?" />
    <AskAndAnswer query="Can you provide me with information about my sleep quality ratings?" />
    <AskAndAnswer query="What's my average ISI rating?" />
    <AskAndAnswer query="What's my average SSO rating?" />
    <AskAndAnswer query="What's my average SE rating?" />
    <AskAndAnswer query="How can I get to sleep faster?" />
    <AskAndAnswer query="Show me my sleep data as a markdown table" />
    <AskAndAnswer query="Show me a chart about my sleep data" />

    {/* <AskAndAnswer query="What's my average DOESNOTEXIST rating?" /> */}
  </>
);

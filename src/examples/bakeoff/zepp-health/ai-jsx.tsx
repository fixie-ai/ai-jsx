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
      <Route when="the user wants to know a specific stat about their sleep">
        Your average Sleep Onset Duration is 0.34 hours.
      </Route>
      <Route when="the user wants advice about their sleep health">here is your advice</Route>
      <Route when="the user wants to see a summary of their sleep data">here is your summary</Route>
      <Route unmatched>
        Based on your sleep data, your Sleep Efficiency (SE) is rated as High, which means that most of the time you
        spend in bed is spent sleeping. Your Slow Sleep Onset (SSO) is rated as Low, which means that you don't have
        much difficulty falling asleep. However, your Insomnia Risk Index (ISI) is rated as Moderate, which means that
        you have some risk of developing insomnia. To improve your sleep, I would recommend establishing a consistent
        sleep schedule, avoiding caffeine and alcohol before bedtime, and creating a relaxing bedtime routine. It may
        also be helpful to limit screen time before bed and create a comfortable sleep environment. If you continue to
        have difficulty sleeping, you may want to consider speaking with a healthcare professional.
      </Route>
    </NaturalLanguageRouter>
  );
}

// LLMx.render(<ZeppHealth query='What can you do?' />)
showInspector(<>
  <ZeppHealth query="Please give me a recipe for cake" />
  {'\n'}{'\n'}
  <ZeppHealth query="What can you do?" />
  {'\n'}{'\n'}
  <ZeppHealth query="Can you provide me with information about my sleep quality ratings?" />
  {'\n'}{'\n'}
  <ZeppHealth query="What's my average ISI rating?" />
  {'\n'}{'\n'}
  <ZeppHealth query="How can I get to sleep faster?" />
  {'\n'}{'\n'}
  <ZeppHealth query="Show me my sleep data as a markdown table" />
</>);

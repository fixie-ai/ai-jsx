import { LLMx } from '../../../lib/index.ts';
import { showInspector } from '../../../inspector/console.tsx';
import { NaturalLanguageRouter, Route } from '../../../lib/natural-language-router.tsx';

function ZeppHealth({ query }: { query: string}) {
  return <NaturalLanguageRouter query={query}>
    <Route when='the user wants to know what you can do'>
      I can show you your sleep data, answer questions about your sleep data, assess your sleep quality based on your sleep data, and provide advice to improve your sleep based on your sleep quality. Sleep quality and advice are based only on ISI, SSO, and SE ratings.
    </Route>
    <Route unmatched>
      I'm sorry, but I can't help with that.
    </Route>
  </NaturalLanguageRouter>
}

LLMx.render(<ZeppHealth query='What can you do?' />)
// showInspector(<ZeppHealth query='What can you do?' />)
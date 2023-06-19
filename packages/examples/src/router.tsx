import { showInspector } from 'ai-jsx/core/inspector';
import { ChatCompletion, SystemMessage, UserMessage } from 'ai-jsx/core/completion';
import { Inline } from 'ai-jsx/core/inline';
import { NaturalLanguageRouter, Route } from 'ai-jsx/batteries/natural-language-router';

function RouterExample() {
  return (
    <>
      Query:{' '}
      <Inline>
        <ChatCompletion temperature={1.3}>
          <SystemMessage>
            You are an assistant that helps cable TV customer service representatives practice customer support. You
            will impersonate a customer with a typical question intended for cable TV customer service representatives.
          </SystemMessage>
          <UserMessage>Hello, please let me know how I may assist you today.</UserMessage>
        </ChatCompletion>
        {(query) => (
          <NaturalLanguageRouter query={query}>
            {'\n'}Response:{' '}
            <Route when="The customer has a question about available plans.">
              I'd be happy to help you learn more about our plans.
            </Route>
            <Route when="The customer thinks our service is too expensive.">
              May I offer you a 20% discount for the next 12 months?
            </Route>
            <Route when="The customer has a question about content.">
              I'd be happy to help you learn more about our award-winning channel lineup.
            </Route>
            <Route when="The customer seems unhappy with our service.">
              I'm sorry that you're not pleased with our service. What can we do to make it right?
            </Route>
            <Route when="The customer wants to cancel their subscription.">
              I'm going to transfer you to our retention department who can "assist" you further.
            </Route>
            <Route when="The customer has technical difficulties.">
              Thank you for your patience, I'm going to transfer you to our technical support team.
            </Route>
            <Route unmatched>I'm sorry, I'm not sure how to help with that.</Route>
          </NaturalLanguageRouter>
        )}
      </Inline>
    </>
  );
}

showInspector(
  <>
    <RouterExample />
    {'\n\n'}
    <RouterExample />
    {'\n\n'}
    <RouterExample />
    {'\n\n'}
    <RouterExample />
    {'\n\n'}
  </>,
  { showDebugTree: false }
);

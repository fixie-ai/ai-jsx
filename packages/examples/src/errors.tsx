import { showInspector } from '../../ai-jsx/src/inspector/console.js';
import { ErrorBoundary } from '../../ai-jsx/src/lib/error-boundary.js';
import { LLMx } from '../../ai-jsx/src/lib/index.js';

function FailingComponent() {
  throw new Error(`Something went wrong! ${Math.random()}`);
}

function App() {
  return (
    <>
      Success: <ErrorBoundary fallback={'❌'}>✅ No Error</ErrorBoundary>
      {'\n'}
      Failure with dynamic fallback:{' '}
      <ErrorBoundary fallback={(ex) => `✅ Error was handled: ${ex}`}>
        <FailingComponent />
      </ErrorBoundary>
      {'\n'}
      Failure with static fallback:{' '}
      <ErrorBoundary fallback={'✅ Error was handled'}>
        <FailingComponent />
      </ErrorBoundary>
      {'\n'}
      Local failure:
      <ErrorBoundary fallback={'❌ The wrong boundary was used'}>
        <ErrorBoundary fallback={'✅ Error was handled'}>
          <FailingComponent />
        </ErrorBoundary>
      </ErrorBoundary>
      {'\n'}
      Fallback failure:
      <ErrorBoundary fallback={'✅ Fallback error was handled'}>
        <ErrorBoundary fallback={<FailingComponent />}>
          <FailingComponent />
        </ErrorBoundary>
      </ErrorBoundary>
      {'\n'}
    </>
  );
}

showInspector(<App />);

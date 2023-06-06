import { showInspector } from '../inspector/console.tsx';
import { ErrorBoundary } from '../lib/error-boundary.tsx';
import { LLMx } from '../lib/index.ts';

function SuccessfulComponent() {
  return '😀';
}

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

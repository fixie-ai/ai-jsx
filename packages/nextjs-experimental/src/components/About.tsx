export default function About() {
  return (
    <div className="flex flex-col items-start px-24 pt-6">
      <div className="w-full overflow-hidden rounded-lg bg-fixie-light-dust shadow-sm">
        <div className="px-4 py-5 sm:px-6">
          <p className="text-center">
            This is a NextJS-based demo of{' '}
            <a className="underline" href="https://ai-jsx.com/">
              AI.JSX
            </a>
            , a JavaScript framework for building applications with Large Language Models. For more info, check out the{' '}
            <a className="underline" href="https://docs.ai-jsx.com/">
              AI.JSX docs
            </a>
            , or the{' '}
            <a className="underline" href="https://github.com/fixie-ai/ai-jsx/tree/main/packages/nextjs-demo">
              source code
            </a>{' '}
            for this app.
          </p>
        </div>
      </div>
    </div>
  );
}

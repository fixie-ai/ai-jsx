import * as LLMx from '@fixieai/ai-jsx';
import { Completion } from '@fixieai/ai-jsx/core/completion';
import { showInspector } from '@fixieai/ai-jsx/core/inspector';

const imageToString = LLMx.createContext<(src: string) => string>((x) => x);

function Image({ src }: { src: string }, { getContext }: LLMx.RenderContext) {
  const imageRenderer = getContext(imageToString);
  return imageRenderer(src);
}

function HTMLProvider({ children }: { children: LLMx.Node }) {
  return <imageToString.Provider value={(src) => `<img src="${src}" />`}>{children}</imageToString.Provider>;
}

function App() {
  return <Image src="http://foo/bar" />;
}

const ctx = LLMx.createRenderContext();
const textAndImages = await ctx.render(
  <HTMLProvider>
    <App />
  </HTMLProvider>
);
console.log(textAndImages);

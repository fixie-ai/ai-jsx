import * as LLMx from 'ai-jsx';
import { Element } from 'ai-jsx';
import { LogLevel } from 'ai-jsx/core/log';
import { Completion } from 'ai-jsx/core/completion';
import { Inline } from 'ai-jsx/core/inline';

function ConsoleLogger(level: LogLevel, element: Element<any>, renderId: string, obj: unknown | string, msg?: string) {
  const args = [] as unknown[];
  args.push(`<${element.tag.name}>`, renderId);
  if (msg) {
    args.push(msg);
  }
  if (obj) {
    args.push(obj);
  }
  console[level === 'fatal' ? 'error' : level](...args);
}

function CharacterGenerator() {
  const inlineCompletion = (prompt: LLMx.Node) => (
    <Completion stop={['"']} temperature={1.0}>
      {prompt}
    </Completion>
  );

  return (
    <Inline>
      The following is a character profile for an RPG game in JSON format:{'\n'}
      {'{'}
      {'\n  '}"class": "{inlineCompletion}",
      {'\n  '}"name": "{inlineCompletion}",
      {'\n  '}"mantra": "{inlineCompletion}"{'\n'}
      {'}'}
    </Inline>
  );
}

console.log(await LLMx.createRenderContext({ logger: ConsoleLogger }).render(<CharacterGenerator />));

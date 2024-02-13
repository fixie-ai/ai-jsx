// import * as AI from 'ai-jsx';
// import { Element } from 'ai-jsx';
// import { LogImplementation, LogLevel, PinoLogger } from 'ai-jsx/core/log';
// import { Completion } from 'ai-jsx/core/completion';
// import { Inline } from 'ai-jsx/core/inline';
// import path from 'node:path';
// import { pino } from 'pino';

// class ConsoleLogger extends LogImplementation {
//   log(level: LogLevel, element: Element<any>, renderId: string, obj: unknown | string, msg?: string) {
//     const args = [] as unknown[];
//     args.push(`<${element.tag.name}>`, renderId);
//     if (msg) {
//       args.push(msg);
//     }
//     if (obj) {
//       args.push(obj);
//     }
//     console[level === 'fatal' ? 'error' : level](...args);
//   }
// }

// async function* Slow({ delay }: { delay: number }): AI.RenderableStream {
//   yield AI.AppendOnlyStream;
//   yield `first ${delay}`;
//   await new Promise((resolve) => setTimeout(resolve, delay));
//   return ` second ${delay}`;
// }

// function CharacterGenerator() {
//   const inlineCompletion = (prompt: AI.Node) => (
//     <Completion stop={['"']} temperature={1.0}>
//       {prompt}
//     </Completion>
//   );

//   return (
//     <>
//       <Slow delay={1000} />
//       <Slow delay={2000} />
//       <Inline>
//         The following is a character profile for an RPG game in JSON format:{'\n'}
//         {'{'}
//         {'\n  '}"class": "{inlineCompletion}",
//         {'\n  '}"name": "{inlineCompletion}",
//         {'\n  '}"mantra": "{inlineCompletion}"{'\n'}
//         {'}'}
//       </Inline>
//     </>
//   );
// }

// console.log(await AI.createRenderContext({ logger: new ConsoleLogger() }).render(<CharacterGenerator />));

// console.log('Writing output to ', path.join(process.cwd(), 'ai-jsx.log'));
// console.log(await AI.createRenderContext({ logger: new PinoLogger() }).render(<CharacterGenerator />));

// console.log('Writing output to stdout via Pino');
// const pinoStdoutLogger = pino({
//   name: 'ai-jsx',
//   level: process.env.loglevel ?? 'trace',
//   transport: {
//     target: 'pino-pretty',
//     options: {
//       colorize: true,
//     },
//   },
// });
// console.log(await AI.createRenderContext({ logger: new PinoLogger(pinoStdoutLogger) }).render(<CharacterGenerator />));

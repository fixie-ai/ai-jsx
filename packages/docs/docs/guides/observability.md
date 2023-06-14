# Observability

In this guide, we'll start with the [hello world example](https://github.com/fixie-ai/ai-jsx-template) and iteratively add logging.

```tsx file="index.tsx"
import * as LLMx from "ai-jsx";
import {
  ChatCompletion,
  SystemMessage,
  UserMessage,
} from "ai-jsx/core/completion";

function App() {
  return (
    <ChatCompletion>
      <SystemMessage>
        You are an agent that only asks rhetorical questions.
      </SystemMessage>
      <UserMessage>How can I learn about Ancient Egypt?</UserMessage>
    </ChatCompletion>
  );
}

console.log(
  await LLMx.createRenderContext().render(<App />)
);
```

This produces no logging.

## File Logging

To log to a file:

```tsx file="index.tsx"
import * as LLMx from "ai-jsx";
import {
  ChatCompletion,
  SystemMessage,
  UserMessage,
} from "ai-jsx/core/completion";
// highlight-next-line
import { PinoLogger } from "ai-jsx/core/log";

function App() {
  return (
    <ChatCompletion>
      <SystemMessage>
        You are an agent that only asks rhetorical questions.
      </SystemMessage>
      <UserMessage>How can I learn about Ancient Egypt?</UserMessage>
    </ChatCompletion>
  );
}

console.log(
  await LLMx.createRenderContext({
    // highlight-next-line
    logger: new PinoLogger(),
  }).render(<App />)
);
```

Now, when you run, you'll see a file created called `ai-jsx.log`. This file will have a bunch of lines in it like:

```json file="ai-jsx.log"
{"level":20,"time":1686758739756,"pid":57473,"hostname":"my-hostname","name":"ai-jsx","chatCompletionRequest":{"model":"gpt-3.5-turbo","messages":[{"role":"system","content":"You are an agent that only asks rhetorical questions."},{"role":"user","content":"How can I learn about Ancient Egypt?"}],"stream":true},"renderId":"6ce9175d-2fbd-4651-a72f-fa0764a9c4c2","element":"<OpenAIChatModel>","msg":"Calling createChatCompletion"}
```

To view this in a nicer way, run `npx pino-pretty < ai-jsx.log`:

```
[12:05:39.756] DEBUG (ai-jsx/57473): Calling createChatCompletion
    chatCompletionRequest: {
      "model": "gpt-3.5-turbo",
      "messages": [
        {
          "role": "system",
          "content": "You are an agent that only asks rhetorical questions."
        },
        {
          "role": "user",
          "content": "How can I learn about Ancient Egypt?"
        }
      ],
      "stream": true
    }
    renderId: "6ce9175d-2fbd-4651-a72f-fa0764a9c4c2"
    element: "<OpenAIChatModel>"
```

`pino-pretty` has a number of [options](https://github.com/pinojs/pino-pretty#cli-arguments) you can use to further configure how you view the logs.

You can use `grep` to filter the log to just the events or loglevels you care about.

## Custom Pino Logging
If you want to customize the log sources further, you can create your own `pino` logger instance:

```tsx file="index.tsx"
import * as LLMx from "ai-jsx";
import {
  ChatCompletion,
  SystemMessage,
  UserMessage,
} from "ai-jsx/core/completion";
import { PinoLogger } from "ai-jsx/core/log";
// highlight-next-line
import { pino } from "pino";

function App() {
  return (
    <ChatCompletion>
      <SystemMessage>
        You are an agent that only asks rhetorical questions.
      </SystemMessage>
      <UserMessage>How can I learn about Ancient Egypt?</UserMessage>
    </ChatCompletion>
  );
}

// highlight-start
const pinoStdoutLogger = pino({
  name: "my-project",
  level: process.env.loglevel ?? "debug",
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
    },
  },
});
// highlight-end

console.log(
  await LLMx.createRenderContext({
    // highlight-next-line
    logger: new PinoLogger(pinoStdoutLogger),
  }).render(<App />)
);
```

When you run this, you'll see `pino-pretty`-formatted logs on stdout. See `pino`'s other [options](https://github.com/pinojs/pino) for further ways you can configure the logging.

## Fully Custom Logging
Pino is provided above as a convenience. However, if you want to implement your own logger, you can create a class that extends `LogImplementation`. The `log` method on your implementation will receive all log events:

```tsx
/**
 * @param level The logging level.
 * @param element The element from which the log originated.
 * @param renderId A unique identifier associated with the rendering request for this element.
 * @param metadataOrMessage An object to be included in the log, or a message to log.
 * @param message The message to log, if `metadataOrMessage` is an object.
 */
log(level: LogLevel, element: Element<any>, renderId: string, metadataOrMessage: object | string, message?: string): void;
```
# Changelog

## 0.30.0

- Added support for Claude 3 and messages API in `AnthropicChatModel`
- Relaxed function calling check for `OpenAIChatModel`

## [0.29.0](https://github.com/fixie-ai/ai-jsx/tree/4ce9b17471ff6cd8e3928d189d254dca8e65e9ba)

- Changed the `FunctionDefinition` and `Tool` types to explicit JSON Schema. Zod types must now be explicitly
  converted to JSON Schema, and the `required` semantics now match JSON Schema.

## [0.28.2](https://github.com/fixie-ai/ai-jsx/tree/524cf2d69eb63426a098723997e39f0dda5a37c2)

- Fix bug where partially streamed unicode characters (e.g. Chinese) would cause an error in OpenAI function calls.

## [0.28.1](https://github.com/fixie-ai/ai-jsx/tree/4c67d845f48585dc3f26e90a9a656471f40c82ed)

- Add `openai.finish_reason` span attribute for `OpenAIChatModel`

## [0.28.0](https://github.com/fixie-ai/ai-jsx/commit/73251358a1121c98e9059c57d3c905b6156447c4)

- Improved completion/prompt logging to include explicit message text

## [0.27.1](https://github.com/fixie-ai/ai-jsx/commit/b5e436615df37c7b68986059892d6043b684df18)

- Fix bug where memoized components could duplicate content
- Refactor `<Converse>` to allow rounds to progress in parallel when content allows

## [0.27.0](https://github.com/fixie-ai/ai-jsx/commit/83627e8d5d7bd86dd2fde505962af92bd25a02a1)

- Add new `batchFrames` render option to coalesce ready frames

## [0.26.1](https://github.com/fixie-ai/ai-jsx/commit/6f27bf8b5d1093e5523bd1214bdec2773182144c)

- Fix `js-tiktoken` import that fails on 1.0.8.

## [0.26.0](https://github.com/fixie-ai/ai-jsx/commit/c5501a1d1016a3cb27259a79bc38b8d68942f761)

- In the `Sidekick` component:
  - Remove the MDX repair attempt.
  - Reduce standard system prompt size.

## [0.25.0](https://github.com/fixie-ai/ai-jsx/commit/e362a16f14f37d75415a89fb8846432e6e7fd89b)

- `Sidekick` can now interject with filler content (e.g. "Let me check on that.") when the model requests a function call.

## [0.24.0](https://github.com/fixie-ai/ai-jsx/commit/b72da82f592f0d9eba12b52b8e89e9abae51a7af)

- Update OpenAI client to 4.16.0
- Add support for OpenAI parallel function calls

## [0.23.0](https://github.com/fixie-ai/ai-jsx/commit/e61c8acff105f69458377f94347e920ade5b9772)

- Update the model enums in `ai-jsx/lib/openai`

## [0.22.1](https://github.com/fixie-ai/ai-jsx/commit/90370c40bccc779e5e49e830f917fd35bcbb87f1)

- In the OpenTelemetry logger, ensure that SeverityNumber is set.

## [0.22.0](https://github.com/fixie-ai/ai-jsx/commit/b5337176cd0d50c1691c2ae4bcc02e71a37b407c)

- In the `Sidekick` component:
  - Put the user system messages before the built-in system messages.
  - Make the MDX formatting logic is conditional on using MDX
  - Accept `children` as the conversation to act on (defaults to `<ConversationHistory>`)

## [0.21.2](https://github.com/fixie-ai/ai-jsx/commit/f59cd9990d9f64f94dc961dd0308f0c0eca44e00)

- Fix a bug in `LimitToValidMdx` where a whitespace character was initially yieled.

## [0.21.1](https://github.com/fixie-ai/ai-jsx/commit/e6064f54fe253e3b8e182fa4f7e05fd37da15dbc)

- `Sidekick` now accepts a `useCitationCard` prop, which controls whether it will emit `<Citation />` MDX components.

## [0.21.0](https://github.com/fixie-ai/ai-jsx/commit/7e1bba39f37300363216e564448b640a12de8db1)

- `Sidekick` is no longer locked to GPT-4-32k. Now, it'll run with whatever model is set by the AI.JSX context.
  - If you pass tools, make sure that the model supports native function calling, or you'll get an error.
- Fix bug in Anthropic's `ChatCompletion` where it was too aggressive in checking that `tools` don't exist.

## [0.20.0](https://github.com/fixie-ai/ai-jsx/commit/96e2e4e7ccca7d9bec7c417da42fb3eca26d2037)

- Remove `finalSystemMessageBeforeResponse` from `Sidekick` component. The `systemMessage` is now always given to the model as the last part of the context window.
- Remove other cruft from the built-in Sidekick system message.
- Remove `Card` component from the Sidekick's possible output MDX components.

## [0.19.0](https://github.com/fixie-ai/ai-jsx/commit/79108af2db3dd59fcf9b53082c3499680335b96c)

- Remove `Prompt` component.
- Remove `role` prop from the `Sidekick` component.
- Fix issue with how the SDK handles request errors.
- Enable Sidekicks to introduce themselves at the start of a conversation.

## [0.18.3](https://github.com/fixie-ai/ai-jsx/commit/b57ed36)

- Fix an issue where empty strings in conversational prompts cause errors to be thrown.

## [0.18.2](https://github.com/fixie-ai/ai-jsx/commit/fc8ada2d9900b179252d377292835dc28998b86f)

- Modified `lib/openai` to preload the tokenizer to avoid a stall on first use
- Fixed an issue where `debug(component)` would throw an exception if a component had a prop that could not be JSON-serialized.

## [0.18.1](https://github.com/fixie-ai/ai-jsx/commit/956ce578eb03f9fd269ae043fa514a7cf711bb06)

- Modified `Sidekick` to add the following options:
  - `outputFormat`: `text/mdx`, `text/markdown`, `text/plain`
  - `includeNextStepsRecommendations`: `boolean`

## [0.18.0](https://github.com/fixie-ai/ai-jsx/commit/36b9f02c866df9df761017fd9f8785d876d15ab8)

- Added components for Automatic Speech Recognition (ASR) in `lib/asr/asr.tsx`.
- Addec components for Text-to-Speech (TTS) in `lib/tts/tts.tsx`.
- ASR providers include Deepgram, Speechmatics, Assembly AI, Rev AI, Soniox, and Gladia.
- TTS providers include Google Cloud, AWS, Azure, and ElevenLabs.

## [0.17.4](https://github.com/fixie-ai/ai-jsx/commit/b002c00d3926e03769438b01443c1bb715ade496)

- Fixed a bug where passing an empty `functionDefinitions` prop to `<OpenAIChatModel>` would cause an error.

## [0.17.3](https://github.com/fixie-ai/ai-jsx/commit/cd206fc81dc4a22eb66f7d95e40cc826b6fd57f3)

- Added the ability to set Anthropic/OpenAI clients without setting the default model

## [0.17.2](https://github.com/fixie-ai/ai-jsx/commit/5d7b202d384fd26a313271ae9f474fb074d938bd)

- Increase the default token limit for automatic API response trimming.

## [0.17.1](https://github.com/fixie-ai/ai-jsx/commit/49ecdada32d7fbea547ca1d7fd6fd9c82617ea00)

- API token limiting: long API responses in `Sidekick` are now automatically truncated. If this happens, the response is chunked and the LLM is given a new function `loadBySimilarity` to query the last function response.

## [0.17.0](https://github.com/fixie-ai/ai-jsx/commit/4ae89b6883660be06854ddd535b82e2d174513fa)

- Changed `<UseTools>` to allow AI.JSX components to be tools.
- Added `FixieAPIConfiguration` context.
- Changed `FixieCorpus` to take a `FixieAPIConfiguration`.
- Added the `FixieCorpus.createTool` helper to create a tool that consults a Fixie corpus.

## [0.16.0](https://github.com/fixie-ai/ai-jsx/commit/c951b4695c97230016b1ae2763649f67089adf92)

- Updated default URL for `<FixieCorpus>` to `api.fixie.ai`.

## [0.15.0](https://github.com/fixie-ai/ai-jsx/commit/9b215e0ea927152ebddc53a800828a4031a3825a)

- Updated DocsQA battery to use the new version of the Fixie corpus REST API.

## [0.14.0](https://github.com/fixie-ai/ai-jsx/commit/f46df6cc40198b82062d61029e47c9d38ef6abf3)

- Updated DocsQA battery to use the new Fixie corpus REST API.

## [0.13.0](https://github.com/fixie-ai/ai-jsx/commit/3f97b9bd030c15c65892ce8bdb409874e3487d13)

- Add Sidekick component. Sidekicks are a high-level abstraction for combining tool use, docs QA, and generated UI.
- Change `MdxSystemMessage` to no longer automatically infer component names from the `usageExamples`. Instead, `usageExamples` is now a plain string, and component names are passed separately via the `componentNames` prop.

## [0.12.0](https://github.com/fixie-ai/ai-jsx/commit/348294ed38be6b6b185f95bb543bc91a40bcf0c4)

- Change the `<ConversationHistory>` component to render to a node from a `ConversationHistoryContext` provider, rather
  than from OpenAI message types.
- Replace usage of `openai-edge` with that of the `openai` v4 package.

## [0.11.0](https://github.com/fixie-ai/ai-jsx/commit/44e7702a449861c1f5435215000b6fc3e1a95171)

- Updated the `<FixieCorpus>` component to use the new Fixie Corpus REST API.
  This is currently only available to users on `beta.fixie.ai` but will be brought
  to `app.fixie.ai` soon.

## [0.10.0](https://github.com/fixie-ai/ai-jsx/commit/b758fe62c2d4c645e3a6271772d78116a97bc64a)

- Memoized streaming elements no longer replay their entire stream with every render. Instead, they start with the last rendered frame.
- Elements returned by partial rendering are automatically memoized to ensure they only render once.
- Streaming components can no longer yield promises or generators. Only `Node`s or `AI.AppendOnlyStream` values can be yielded.
- The `AI.AppendOnlyStream` value is now a function that can be called with a non-empty value to append.

## [0.9.2](https://github.com/fixie-ai/ai-jsx/commit/219aebeb5e062bf3470a239443626915e0503ad9)

- In the [OpenTelemetry integration](./guides/observability.md#opentelemetry-integration):
  - Add prompt/completion attributes with token counts for `<OpenAIChatModel>`. This replaces the `tokenCount` attribute added in 0.9.1.
  - By default, only emit spans for `async` components.

## [0.9.1](https://github.com/fixie-ai/ai-jsx/commit/0d2e6d8ecd1c75b457d0d6c76ff854c9145a9f5f)

- Add `tokenCount` field to [OpenTelemetry-emitted spans](./guides/observability.md#opentelemetry-integration). Now, if you're emitting via OpenTelemetry (e.g. to DataDog), the spans will tell you how many tokens each component resolved to. This is helpful for answering quetsions like "how big is my system message?".

## [0.9.0](https://github.com/fixie-ai/ai-jsx/commit/94624bedc27defc96f7cfead96094c8a577c8e27)

- **Breaking:** Remove prompt-engineered `UseTools`. Previously, if you called `UseTools` with a model that doesn't support native function calling (e.g. Anthropic), `UseTools` would use a polyfilled version that uses prompt engineering to simulate function calling. However, this wasn't reliable enough in practice, so we've dropped it.
- Fix issue where `gpt-4-32k` didn't accept functions.
- Fix issue where Anthropic didn't permit function call/responses in its conversation history.
- Add Anthropic's claude-2 models as valid chat model types.
- Fix issue where Anthropic prompt formatting had extra `:`s.

## 0.8.5

- Fix issue where OpenTelemetry failures were not being properly attributed.

## [0.8.4](https://github.com/fixie-ai/ai-jsx/commit/652dcd51d2ce16d77130fe40488e5e609a164af2)

- Add OpenTelemetry integration for AI.JSX render tracing, which can be enabled by setting the `AIJSX_ENABLE_OPENTELEMETRY` environment variable.

## [0.8.3](https://github.com/fixie-ai/ai-jsx/commit/0c0309382d5beb6e3bb177fc5af464a4cf6ab3ef)

- Throw validation errors when invalid elements (like bare strings) are passed to `ChatCompletion` components.
- Reduce logspam from memoization.

## [0.8.2](https://github.com/fixie-ai/ai-jsx/commit/4ff41e2bbafaa89901d9c79e8a639f46d956f08d)

- Fix issue where the `description` field wasn't passed to function definitions.

## [0.8.1](https://github.com/fixie-ai/ai-jsx/commit/c6dfba422761f23ad4939c746a4a369385dc1f36)

- Add support for token-based conversation shrinking via `<Shrinkable>`.

## [0.8.0](https://github.com/fixie-ai/ai-jsx/commit/58062b9e42b2ccecd467de90ee1dedf7ec70dfbf)

- Move `MdxChatCompletion` to be `MdxSystemMessage`. You can now put this `SystemMessage` in any `ChatCompletion` to prompt the model to give MDX output.

## [0.7.3](https://github.com/fixie-ai/ai-jsx/commit/670ea52647138052cb116cbc56b6cc4bb49512a0)

- Update readme.

## [0.7.2](https://github.com/fixie-ai/ai-jsx/commit/203574abdbdce22c876a0c5a3a94dcc093b753cb)

- Add `Converse` and `ShowConversation` components facilitate streaming conversations.

## [0.7.1](https://github.com/fixie-ai/ai-jsx/commit/058c463a32321d754639dcf44a2b6f3b5a863d1f)

- Change `ChatCompletion` components to render to `<AssistantMessage>` and `<FunctionCall>` elements.

## [0.7.0](https://github.com/fixie-ai/ai-jsx/commit/f8c8cff92fa1f228bf5826e8a0ac7129df765150)

- Move `memo` to `AI.RenderContext` to ensure that memoized components render once, even if placed under a different context provider.

## [0.6.1](https://github.com/fixie-ai/ai-jsx/commit/625459d25d538019e42afe8ba952c89b363ff662)

- Add `AIJSX_LOG` environment variable to control log level and output location.

## [0.6.0](https://github.com/fixie-ai/ai-jsx/commit/7fce0f4ae4eca4d2679177ecb357cd60699e3913)

- Update `<UseTools>` to take a complete conversation as a `children` prop, rather than as a string `query` prop.

## [0.5.16](https://github.com/fixie-ai/ai-jsx/commit/5017e6fd)

- Update `toTextStream` to accept a `logger`, so you can now see log output when you're running AI.JSX on the server and outputting to a stream. See [AI + UI](./guides/ai-ui.md) and [Observability](./guides/observability.md).

## [0.5.15](https://github.com/fixie-ai/ai-jsx/commit/68adddd)

- Add [`MdxChatCompletion`](./guides/mdx.md), so your model calls can now output [MDX](https://mdxjs.com/) using your components.

## [0.5.14](https://github.com/fixie-ai/ai-jsx/commit/5971243)

- Add [Llama2 support](./guides/models.md#llama2).

## [0.5.13](https://github.com/fixie-ai/ai-jsx/commit/80e25c7d701d0d227e6815f4303ca7dc28dfce0c)

- Add [`DocsQAWithSources` component](./guides/docsqa.md#handling-a-query)

## 0.5.12

- Updated `readme.md` in the `ai-jsx` package to fix bugs on the npm landing page.

## [0.5.11](https://github.com/fixie-ai/ai-jsx/commit/7d5c0fca9c9e1088be7fa0c8a2c74a7db2745e9d)

- Make JIT UI stream rather than appear all at once.
- Use `openai-edge` instead of `@nick.heiner/openai-edge`

## [0.5.10](https://github.com/fixie-ai/ai-jsx/commit/e2735fde8c33e3019a074c29824206d9725eed64)

- Update logging to log the output of every component.
- Update [`UseTools`](./api/modules/batteries_use_tools.md) to use [OpenAI function calls](https://openai.com/blog/function-calling-and-other-api-updates) if you're using a model that supports them.

## [0.5.9](https://github.com/fixie-ai/ai-jsx/commit/92b6e0f28580fbd9b8fb62072d8c13e28b14d9fe)

- [Add Anthropic support.](./guides/models.md).

## [0.5.8](https://github.com/fixie-ai/ai-jsx/commit/89c87a8ed6d394ce443ad074ae38152f54c7bddc)

- [`ImageGen`](./api/modules/core_image_gen.md#image) now produces an [`Image`](./api/modules/core_image_gen.md#image) object which will render to a URL in the command line, but returns an `<img />` tag when using in the browser (React/Next).

## [0.5.7](https://github.com/fixie-ai/ai-jsx/commit/8c29bb65fa2d4d26893eabebf5aa63f1506703e7)

- Add ability to stream UI components in the [UI on the client; AI.JSX on the server](./guides/architecture.mdx#ui-on-the-client-aijsx-on-the-server) architecture pattern.
- Add ability to do append-only text streaming.
- Update [`UseTools`](./api/modules/batteries_use_tools.md) to match [OpenAI function syntax](https://openai.com/blog/function-calling-and-other-api-updates).
- Add `ConversationalHistory` component.

## [0.5.6](https://github.com/fixie-ai/ai-jsx/commit/92c34d97687bfdb7ed839b78fef3b4683acd0756)

- Improve legibility of error messages + overall error handling.
- DocsQA: add ability [to use a Fixie corpus](./guides/docsqa.md#picking-a-corpus-implementation).

## [0.5.5](https://github.com/fixie-ai/ai-jsx/commit/d7ac6e3bfedf0d57728b30df075708dff2055df5)

- Fix build system issue that caused problems for some consumers.

## [0.5.4](https://github.com/fixie-ai/ai-jsx/commit/469754097e9f3affd416c66341c79573a06aa8b9)

- Remove need for projects consuming AI.JSX to set `"moduleResolution": "esnext"` in their `tsconfig`.
- Adding Weights and Biases integration

## [0.5.3](https://github.com/fixie-ai/ai-jsx/commit/a1a293c4df92d3ab03fe110bc7b0318c30c1362f)

- Fix how env vars are read.

## [0.5.2](https://github.com/fixie-ai/ai-jsx/commit/3267098fd3659bd784c3e40d660d0d7521d1bf4a)

- When reading env vars, read from `VAR_NAME` and `REACT_APP_VAR_NAME`. This makes your env vars available to projects using `create-react-app`.
- Add OpenAI client proxy.

## [0.5.1](https://github.com/fixie-ai/ai-jsx/commit/856a2501592f157641d0d99c70fda960b0f7117a)

- Initial release

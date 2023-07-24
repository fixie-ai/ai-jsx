# Changelog

## 0.5.15

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
- [Add OpenAI client proxy.](./guides/openai#set-a-proxy-env-var)

## [0.5.1](https://github.com/fixie-ai/ai-jsx/commit/856a2501592f157641d0d99c70fda960b0f7117a)

- Initial release

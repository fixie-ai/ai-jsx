# AI + UI

Demo video: [![Loom video](../../docs/loom.png)](https://www.loom.com/share/79ca3706839049a2beaf70f75950f86f)

This is experimental but we're excited about it as a first step towards AI-native app development. Try it if you dare!

For this demo, we've set up a hacked version of NextJS to support server-side rendering with seamless integration of AI.JSX and React components. The subdemos are:

- [Basic completion](../../packages/nextjs-demo/src/app/basic-completion/page.tsx): Streaming the AI's response directly to the browser.
- [JIT UI: React](../../packages/nextjs-demo/src/app/recipe/page.tsx): We provide building block components, and the AI decides how to assemble them into the final output.
- [JIT UI: Raw HTML](../../packages/nextjs-demo/src/app/nl-gh-search/page.tsx): We teach the AI to query GitHub, and invite it to inject whatever HTML it wants into our UI. 😱
- [Sleep](../../packages/nextjs-demo/src/app/z/page.tsx): An AI app with non-trivial business logic, streamed to the client.

As you hack around with

# AI.JSX

AI.JSX is a framework that helps you build [AI-powered apps](./guides/brand-new.md). It aims to solve the following problems for developers:

- “How do I get data into my LLM call?”
- “How do I easily switch between model providers?”
- “How do I performantly chain the results of LLM calls together?”
- “How do I take advantage of community tools + patterns (e.g. chain of thought)?”
- “How do I make the model use tools?”
- “How do I constrain the model’s output?”
- “How do I structure my app in a post-AI world?”

JSX provides a powerful substrate on which to build apps that address these needs.

```tsx
function App() {
  return (
    <ChatCompletion>
      <SystemMessage>You are an assistant who only uses one syllable words.</SystemMessage>
      <UserMessage>Why is the sky blue?</UserMessage>
    </ChatCompletion>
  );
}

showInspector(<App />);
// ==> "Sky blue due to light."
```

# Prerequisite Knowledge

- [JSX](https://www.patterns.dev/posts/reactjs) (that overview is React-specific but almost everything is transferrable to JSX generally).
- [TypeScript](https://www.typescriptlang.org/)

# This README is mostly aspirational. For more detail, see [Notion: AI.JSX Design](https://www.notion.so/fixieai/AI-JSX-Design-159fde6bf8d6466487eac3d4ee1f9a93?pvs=4).

# AI.JSX

> A type-safe framework for building LLM-powered apps in JS.

AI.JSX is a project that lets you use type-safe JSX to construct AI programs from components. For example:

<!-- prettier-ignore -->
```tsx
/**
 * Answer a customer's question about their account, using our company's knowledge base, and specific info about that customer.
 */
function AnswerQuestion({ children: question }: { children: string }) {
  return (
    <Completion>
      You are an expert customer service agent who answers customer questions.
      
      The customer has asked you: {question}
      
      Here's some relevant data about the customer's account:
      <RelevantUserData topic={question} />
      
      Here's some relevant context from our knowledge base:
      <DocsQA retriever={myCompanyHelpArticles} topic={question} />
      
      Your answer is:
    </Completion>
  );
}
```

<!-- If we had an LLM glossary, it would be super useful here, since the target audience will be less familiar with the core concepts. Even a 1-page explainer would be nice. -->

In the above example, we're constructing a prompt to pass to the AI. The nested components (`RelevantUserData` and `DocsQA`) inject dynamic content into our prompt, taking the original question as input.

We would call it like this:

```tsx
await render(<AnswerQuestion>When does my annual subscription renew?</AnswerQuestion>);
// ==> "Your annual subscription renews on October 1st."
```

<details>
<summary>More examples</summary>

## Stock Advisor

<!-- prettier-ignore -->
```tsx
/**
 * Example usage: <StockAdvisor>nflx</StockAdvisor>
 */ 
function StockAdvisor({children: symbol}: {children: string})
  <Completion>
    {/* Put the LLM in character */}
    <Prompt expert="stock picker" apolitical polite />

    {/* Provide some realtime data to work with */}
    <StockData symbol={symbol} />

    {/* Describe the task */}
    Advise the user on whether to buy or sell {symbol}.
  </Completion>
```

See more: [prompt templates](#prompt-library-tailwind-for-llms), [injecting live data](#injecting-live-data)

## Fantasy Story Generator

<!-- prettier-ignore -->
```tsx
function FantasyStoryteller() {
  <>
    Tell a story about <InlineCompletion
      label="childName"
      model={openAI({temperature: 1})}>
        child name
    </InlineCompletion>,
    a brave child from the town of
      <InlineCompletion
        label="townName"
        validateResponse={townName => isNotRealTown(townName)}
        model={openAI({temperature: 1})}>
          fantasy town name
      </InlineCompletion>
  </>
}

const { childName, townName } = await render(<FantasyStory />);
```

See more: [getting parts of the output](#getting-parts-of-the-output-vs-the-whole-thing), [constraining output](#constraining-output).

</details>

<details>
<summary>Why use JSX to build prompts?</summary>

- String construction is at the core of LLM apps
- JSX is a powerful declarative templating system with broad community support
- JSX makes it easy to componentize your prompt

Without JSX, the example above would look like:

```tsx
async function AnswerQuestion(question: string): Promise<string> {
  const userData = await fetchUserData(question);
  const docs = await docsQA({
    retriever: myCompanyHelpArticles,
    topic: question,
  });
  return completion({
    prompt: `
      You are an expert customer service agent who answers customer questions.
      You are polite and helpful.
      You stick to the facts as presented here; you do not make things up.
      
      The customer has asked you: ${question}
      
      Here's some relevant data about the customer's account:
      ${userData}
      
      Here's some relevant context from our knowledge base:
      ${docs}
      
      Your answer is:      
    `,
  });
}
```

[You can use this library without JSX](#use-without-jsx). But we believe JSX is more declarative and readable. And, when returning JSX, the component tree can be constructed without actually blocking on the promises. When you use template strings directly, you lose that ability, and thus will potentially block on slow LLM calls more often than necessary.

</details>

**Other features AI.JSX offers:**

- A simple set of primitives to build on
- Included batteries that are available if you need them
- Model agnosticism, so you can easily switch between models
- Full observability, both locally when debugging and in production (via integration into popular observability platforms like [Weights and Biases](https://wandb.ai/site)).
- First class, free-to-get-started production hosting on [Fixie](https://fixie.ai/).

**How does AI.JSX compare to other tools?**

1. [Langchain](https://js.langchain.com/docs/) is less typesafe and declarative than AI.JSX. It provides a ton of integrations with third-party tools; whereas AI.JSX focuses on providing a powerful yet simple set of primitives. You can use Langchain's integrations from AI.JSX.

- Python tools
  1. [Guidance](https://github.com/microsoft/guidance) is conceptually similar. It uses a bespoke string templating language inspired by handlebars, as opposed to fully-featured JSX.
  1. [LMQL](https://lmql.ai/) is conceptually similar, but with fewer batteries, and a bespoke templating language. It lacks an affordance for nested structures, which JSX makes trivial.
  1. [Semantic Kernel](https://learn.microsoft.com/en-us/semantic-kernel/overview/) solves a similar set of usecases but is more imperative/less declarative.

## Table of Contents

- [LLM Basics](#llm-basics): Building block primitives solving common needs for LLM apps
  - [Getting Started Example](#getting-started-example-componentizing-a-prompt)
    - [It's Not React](#its-not-react)
  - [Conditional logic (Conversational Router)](#conditional-logic-from-llm-driven-inputs)
  - [Injecting live data](#injecting-live-data)
  - [Types of completion](#inline-vs-isolated-completions)
  - [Constrained Output](#constraining-output)
  - [Getting parts of the completion vs. the whole thing](#getting-parts-of-the-output-vs-the-whole-thing)
  - [Self-evaluation](#llm-self-evaluation)
  - [Error Boundaries](#error-boundaries)
  - [LLM Settings](#controlling-llm-settings)
  - [Use without JSX](#use-without-jsx)
  - [Streaming](#streaming)
  - [Setting context for chat agents](#setting-context-for-chat-agents)
- [Batteries Included](#batteries-included): Powerful patterns to enable more complex scenarios.
  - [DocsQA](#docsqa)
  - [Retrievers](#retrievers)
  - [Vector search](#vector-search)
    - HyDE
  - [Using Tools](#using-tools)
  - ReAct Pattern
  - Chain of Thought
  - [Prompt Library "Tailwind for LLMs"](#prompt-library-tailwind-for-llms)
- [Moving to Production](#moving-to-production): Tools supporting real-world deployment.
  - [Observability](#observability)
    - [Logging](#logging)
    - [Errors](#errors)
  - [Hosting](#hosting)

## LLM Basics

AI.JSX offers a number of primitives that act as the basic building blocks of LLM-powered applications.

### Getting Started Example: Componentizing a Prompt

With AI.JSX, you use all the standard JSX syntax you're familiar with to declaratively specify a prompt, organized into components.

```tsx
/**
 * Generate a rap battle between two famous scientists, then has a third scientist judge the results.
 */
function RapBattle({ topic, rounds, speakers }: { topic: string; rounds: number; speakers: [string, string] }) {
  return (
    <Completion model={openAI({ temperature: 1 })}>
      You are Grace Hopper, a renowed scientist and rap battle judge. Look at this rap battle, then judge the winner.
      {_.range(rounds).map((roundIndex) => (
        <>
          <Rap speaker={speakers[0]} topic={topic} />
          <Rap speaker={speakers[1]} topic={topic} />
        </>
      ))}
      Give a single verse of rap of your own explaining who the winner is:
    </Completion>
  );
}

/**
 * Generate a rap from a speaker.
 */
function Rap({ speaker, topic }: { speaker: string; topic: string }) {
  return (
    <InlineCompletion model={openAI({ temperature: 1 })}>
      You are {speaker}, a famous scientist and expert rapper. You are in a rap battle about {topic}. Give a verse in
      the battle:
    </InlineCompletion>
  );
}

await render(<RapBattle topic="Who is the better scientist?" speakers={['Marie Curie', 'Ada Lovelace']} rounds={3} />);
/**
 * ==>
 *
 * MC: Radium and polonium, now that's true innovation,
 * Two Nobel prizes for pioneering radiation!
 * While you were scribbling notes, I was making history,
 * Discoveries that changed science and earned me glory!
 *
 * AL: Please, I'm the visionary, the Enchantress of Numbers,
 * Algorithms and computing, that's where my fame slumbers.
 * I laid foundations for the digital age,
 * While you followed conventions, I was turning the page!
 *
 * GH: Ladies, no need to battle, you're both legends who
 * Pioneered progress for all humanity.
 * Ada's logic, Marie's discoveries,
 * Science owes you both, so end this rivalry!
 * Your works were visionary, in fields far and apart,
 * Together, you've already won my heart!
 */
```

#### It's Not React

In React, you're specifying a stateful UI tree. The tree has a lifecycle: mounting, state updates, unmounting, etc.

AI.JSX has a simpler model: you're just constructing a string. So there's no state or lifecycle (no `useState`, `useEffect`, etc). A component renders once. You also don't need `key` properties on iterated outputs. And your components can be async.

<!-- But maybe it is React, via react server components. -->

### Conditional Logic from LLM-Driven Inputs

When building LLM apps with conditional logic, you can take two approaches:

1. Describe all the logic you want in the LLM prompt and hope the LLM does the right thing.
1. Intermix LLM and deterministic logic.

Approach (1) may work for simple cases; (2) is often more reliable for more complex flows.

Approach (1) looks something like this:

```
You are a customer service agent. You take incoming requests from customers and handle them appropriately.
If the customer is angry, apologize and offer a refund.
If the customer wants to cancel their account, as a follow-up question.
If the customer wants something unrelated to our company, tell them you can't help.
```

With AI.JSX, we can implement approach (2) with the Conversational Router:

```tsx
function HandleCustomerRequest({request}: {request: string})
  return <Completion>
    You are a customer service agent. You take incoming requests from customers and handle them appropriately.
    <Router input={request}>
      <Route when='customer is angry'>
        <Apology />
      </Route>
      <Route when='customer wants to cancel'>
        <CancelFlow />
      </Route>
      <Route unmatched>
        <SorryICannotHelp />
      </Route>
    </Route>
  </Completion>
}
```

A different use-case: your app does something based on an LLM's evaluation of an input, but it's not constructing an LLM-generated response for the user. In this case, you don't need to template a full response – you just use the AI.JSX API to access the switch directly.

```tsx
async function handleCustomerRequest({ request }: { request: string }) {
  const options = {
    angry: 'the customer is angry',
    cancel: 'the customer wants to cancel their account',
  };
  const classification = await render(<Choose input={request} options={options} />);

  switch (classification) {
    case 'angry':
      redirectUserToApologyMicrosite();
      break;
    case 'cancel':
      cancelCustomerAccount();
      return render(
        <Completion>
          Apologize to the user for failing to meet their expectations. Their cancel request is: {request}
        </Completion>
      );
  }
}
```

### Injecting Live Data

You'll often want to prompt the LLM with live data about the problem you're current trying to solve. For instance, imagine we're building a customer service agent. To accurately respond to user questions, we'll want to inject data about the user's profile into the prompt:

```tsx
async function CustomerServiceAgent({ question, userId }: { question: string; userId: UserId }) {
  const userData = await fetchUserData(userId);
  return (
    <Completion>
      You are an expert customer service agent. You're answering a question for {userData.name}, who has the following
      account info: <Stringify>{userData}</Stringify>.{userData.name}'s question is: {question}
    </Completion>
  );
}
```

### Inline vs. Isolated Completions

When you're building a prompt with sub-parts, there are two ways you might want that sub-part to relate to the whole:

1. The sub-part is aware of what comes before it ("inline").
1. The sub-part is isolated.

You'd use inline completion in a case like this:

<!-- prettier-ignore -->
```tsx
<Completion>
  Generate a YAML object that represents a dog. 
  dog: 
    name: <InlineCompletion>dog name</InlineCompletion>
    breed: <InlineCompletion>dog breed</InlineCompletion>
</Completion>
```

In this instance, we want the `dog name` and `dog breed` prompts to be aware of everything that's been built up before it.

The first thing the model sees is:

```
Generate a YAML object that represents a dog.
dog:
  name:
```

The model will generate something like `Sparky`. Then, for the second `InlineCompletion`, the model sees:

```
Generate a YAML object that represents a dog.
dog:
  name: Sparky
  breed:
```

Now the model will generate a breed that sounds like it would be a good fit for a dog named Sparky.

This greater structure improves the coherence of the overall output. And by providing a more specific prompt and leaving the model with smaller pieces to fill in, we get more predictable output than if we'd merely written:

<!-- prettier-ignore -->
```tsx
<Completion>
  Generate a YAML object that represents a dog with `name` and `breed` fields.
</Completion>
```

### Constraining Output

Sometimes you want the model to only output a specific type of value. AI.JSX's `Completion` component has props allowing you to express this:

```tsx
<Completion maxTokens={10}>dog name</Completion>

<Completion regex={/\d{4}/}>year after 2000</Completion>

<Completion oneOf={['happy', 'sad']}>what is the mood of the author of this tweet? {tweet}</Completion>

import z from 'zod';
const mySchema = z.object({
  name: z.string(),
  luckyNumbers: z.array(z.number()),
});
<JsonCompletion schema={mySchema}>Generate a lottery player.</JsonCompletion>
<YamlCompletion schema={mySchema}>Generate a lottery player.</YamlCompletion>
```

You can build components to encapsulate your app's validation logic. For example:

```tsx
/**
 * Generate a fake user for testing.
 */
function TestUserData() {
  return <>
    Name: <Name />
    Phobia: <Phobia />
    Street Address: <StreetAddress />
  </>
}

function ConstrainedResponse({children: description, ...rest}) {
  return <Completion {...rest}>
    Generate {description}. Reply only with this generation; do not include any other text.
  </Completion>
}

function Name() {
  return <ConstrainedResponse maxTokens={10}>a first and last name of a fake person</ConstrainedResponse>
}
function Phobia() {
  return <ConstrainedResponse maxTokens={40}>a phobia</ConstrainedResponse>
}
function Street Address() {
  const listOfRealAddresses = getFamousLondonAddresses();
  return <ConstrainedResponse
    maxTokens={100}
    validate={candidate => !listOfRealAddresses.includes(candidate)}>
      a fake street address in London
  </ConstrainedResponse>
}
```

### Getting parts of the output vs. the whole thing

Imagine we're generating profiles for fake dogs:

<!-- prettier-ignore -->
```tsx
function GenerateDog() {
  return (
    <>
      Generate a YAML object that represents a dog. 
        dog: 
          name: <InlineCompletion>dog name</InlineCompletion>
          breed: <InlineCompletion>dog breed</InlineCompletion>
    </>
  );
}

const dog = await render(<GenerateDog />);
/**
 * ==>
 *
 * Generate a YAML object that represents a dog.
 * dog:
 *  name: Sparky
 *  breed: Pointer
 */
```

It would be more helpful if we could pull out the YAML directly:

<!-- prettier-ignore -->
```tsx
function GenerateDog() {
  return (
    <>
      Generate a YAML object that represents a dog.
      <span label="yaml">
        dog:
          name: <InlineCompletion>dog name</InlineCompletion>
          breed: <InlineCompletion>dog breed</InlineCompletion>
      </span>
    </>
  );
}

const { yaml } = await render(<GenerateDog />);
/**
 * yaml ==>
 *  dog:
 *    name: Sparky
 *    breed: Pointer
 */
```

Now we have access to the YAML directly, and can parse it to fetch the fields.

But what if the part we cared about wasn't a structured format?

```tsx
<>
  Tell a story about <InlineCompletion>child name</InlineCompletion>, a brave child from the town of
  <InlineCompletion>fantasy town name</InlineCompletion>
</>
```

In this case, if we want to access the generated sub-parts directly, we can use `label`:

```tsx
<>
  Tell a story about <InlineCompletion label="childName">child name</InlineCompletion>, a brave child from the town of
  <InlineCompletion label="townName">fantasy town name</InlineCompletion>
</>
```

And then access it as:

```tsx
const { childName, townName } = await render(<FantasyStory />);
```

Any AI.JSX element accepts a `label` prop.

<!-- TODO: unify the API for when you are pulling out labels vs. want the entire prompt back vs. want just the completion -->

### LLM Self-Evaluation

A common technique in LLM apps is to use LLMs to constrain LLM-generated output. For instance, [Constitutional AI](https://www.anthropic.com/index/constitutional-ai-harmlessness-from-ai-feedback) is an approach where you have multiple LLM passes:

1. The first generates your response.
1. The second evaluates the first pass, rewriting it as necessary to meet specified standards.

For instance:

```tsx
<Constitution requirement="Responses must be nice." revision="Rewrite the response to be nice">
  <Completion>
    You are a customer service agent. The customer has asked you this question: {question}
    You respond with:
  </Completion>
</Constitution>
```

In this example, if the inner `Completion` generated a response that the outer `Constitution` found to be unkind, the outer layer would rewrite the response to fix it.

Another application of this approach include strategies is asking the LLM to self-critique:

<!-- prettier-ignore -->
```tsx
<Completion>
  You are an expert peer-reviewer and editor. One of your colleagues has answered a student's question.
  
  The original question was: {question}
  
  The response is:
  <Completion>
    You are an expert researcher. A student asked you this question: {question}.
    You reply:
  </Completion>

  Do you agree? If you think your colleague made any mistakes, rewrite their answer below to correct them. Otherwise, return
  the response verbatim.
</Completion>
```

Maybe, in your testing, you found that OpenAI was good at generating initial responses, and Anthropic was good at editing them. To take advantage of this, you can pass different model props to each `Completion`:

```tsx
<Completion model={anthropic}>
  You are a reviewer {/* ... */}
  <Completion model={openai}>You are a researcher {/* ... */}</Completion>
</Completion>
```

To make a reviewer component:

```tsx
function PeerReviewer({ children: toReview }) {
  return (
    <Completion model={anthropic}>
      You are a reviewer {/* ... */}
      {toReview}
      Do you agree? If you think your colleague made any mistakes, rewrite their answer below to correct them.
      Otherwise, return the response verbatim.
    </Completion>
  );
}

<PeerReviewer>
  <Completion>You are an expert researcher. A student asked you this question: {question}. You reply:</Completion>
</PeerReviewer>;
```

### Error Boundaries

Imagine you have an app that answers questions about dogs:

<!-- prettier-ignore -->
```tsx
<Completion>
  You are a dog expert answering a question. The question: {question}
  
  Related questions you've gotten in the past: <PreviousQuestions similarTo={question} />
  
  Relevant context from Wikipedia: <WikipediaDocsQA query={question} />
  
  Your answer:
</Completion>
```

If one of those components throws an error, your whole completion will fail. However, we could imagine that we want to gracefully degrade instead. We can do that with an error boundary:

<!-- prettier-ignore -->
```tsx
<Completion>
  You are a dog expert answering a question. The question: {question}
  Related questions you've gotten in the past:
  
  <ErrorBoundary fallback="Sorry, the database was not available">
    <PreviousQuestions similarTo={question} />
  </ErrorBoundary>
  
  {/* In our example, Wikipedia errors should be treated as fatal, so don't wrap it in an error boundary. */}
  Relevant context from Wikipedia: <WikipediaDocsQA query={question} />

  Your answer:
</Completion>
```

In the `PreviousQuestions` component fails, the LLM will see this prompt:

<!-- prettier-ignore -->
```
  You are a dog expert answering a question.
  
  The question: how big do Golden Retrievers get?
  
  Related questions you've gotten in the past: Sorry, the database was not available
  
  Relevant context from Wikipedia:
    * Golden Retrievers are a popular dog breed.
    * Golden Retrievers get to be hundreds and hundreds of pounds.
    * Golden Retrievers are the majority of the biomass in the Amazon rainforest.

  Your answer:
```

Alternatively, we could use an error boundary to hide a prompt part entirely in case of an error:

```tsx
<ErrorBoundary fallback="">
  Related questions you've gotten in the past:
  <PreviousQuestions similarTo={question} />
</ErrorBoundary>
```

In this case, if the `PreviousQuestions` lookup failed, the entire sub-part would be replaced with the empty string.

### Controlling LLM settings

The `UseModel` component allows you to set LLM settings for all child components, similar to React's `context`.

```tsx
<UseModel config={myModelConfig}>
  <MyIntro />
  <Completion model={/* passing a value here will override the useModel value */}>
  <MyMiddle />
  <UseOtherModel config={myOtherConfig}>
    <MyOutro />
  </UseOtherModel>
</UseModel>
```

In this example, we set `UseModel` with `myModelConfig` for the entire tree. However, we override it for `MyOutro` and all its child components. We also override it for the `Completion` component specifically.

When a component wants to make an LLM call, it gets config by searching up the tree for the nearest `UseModel` parent.

Setting `UseModel` at the root also lets you easily switch your entire project between models.

### Use Without JSX

If you don't want to use JSX in your project, you can still use all the APIs this framework offers:

```tsx
// JSX
import { render } from 'ai/jsx';
await render(<Completion model={openAI({ temperature: 0.3 })}>Generate three dog names</Completion>);

// JS
import { completion } from 'ai/js';
await completion({
  prompt: 'Generate three dog names',
  model: openAI({ temperature: 0.3 }),
});
```

If you prefer, you can use template strings to build prompts instead:

```ts
import { completion, inlineCompletion } from 'ai/js';

await completion({
  prompt: `
  Generate YAML for a dog:

  dog:
    name: ${await inlineCompletion({
      prompt: 'dog name',
      label: 'dog-name'
      model: openAI({ temperature: 0.3 }),
    })}
    breed: ${await inlineCompletion({
      prompt: 'dog breed',
      label: 'dog-breed'
      model: openAI({ temperature: 0.3 }),
    })}
  `,
  model: openAI({ temperature: 0.3 }),
});
```

### Streaming

Some applications benefit from streaming the output as it's generated, rather than waiting for it to be completely done before returning. To do this:

```tsx
const readStream = await render(<MyApp />, { stream: true });
// ==> readStream is a ReadableStream: https://nodejs.org/api/stream.html#readable-streams
```

You may also want to provide input as a stream. For instance, if you're using the Anthropic 100k model, you may wish to upload your data without putting it all in memory on your currently-running process. To support this, you can pass a writable stream directly in the JSX:

```tsx
import fs from 'node:fs';

const greatGatsby = fs.createReadStream('gatsby.txt');
<Completion>Summarize this book: {greatGatsby}</Completion>;
```

### Setting context for chat agents

Some chat APIs, like GPT-4, allow the caller to specify three types of messages: `system`, `user`, and `assistant` ([more detail](https://platform.openai.com/docs/guides/chat/chat-vs-completions)):

- `system`: Messages instructing the agent
- `user`: Messages that have been previously sent by the user
- `assistant`: Messages that have been previously sent by the agent

You can use those with AI.JSX, when using a compatible model:

```tsx
<Completion model={openAI({ model: 'gpt-4' })}>
  <System>You are a helpful assistant that translates English to French.</System>
  <User>I would like some cheese.</User>
  <Assistant>Je voudrais du frommage.</Assistant>
  <User>Can you make the cheese extra pungent?</User>
</Completion>
```

Evaluating this prompt would cause the agent to respond with the next `Assistant` message it predicts.

## Batteries Included

Production-grade LLM applications that can handle complex use-cases often have similar needs, like being able to do lookups in a relevant knowledge base. AI.JSX includes batteries to help you with this (but you don't have to use them).

### DocsQA

DocsQA is the technique used to give the LLM context about real-world data, beyond what the LLM learned in its training:

```tsx
<Completion>
  You are an expert customer service agent. Answer a question for {user.name}. Here is some relevant context:{' '}
  <DocsQA retriever={zendesk}>{question}</DocsQA>. Here is the question: {question}
  Your answer:
</Completion>
```

In the above example, we use the `DocsQA` component to fetch relevant articles from our Zendesk knowledge base.

The `DocsQA` component API:

```tsx
interface DocsQAProps {
  /**
   * A Retriever to use to fetch your docs.
   */
  retriever: Retriever;

  /**
   * The content about which relevant docs will be fetched.
   *
   * For example, if you pass "how do I file a claim", this component will look up docs about claim filing.
   */
  children: string;

  /**
   * The maximum number of tokens of context to return.
   *
   * Higher values will cause more context to be returned to your prompt, giving the LLM more data to work with
   * to answer the question. But it also leaves you with less room in your prompt for other things, and increases your
   * compute costs with the model provider.
   */
  maxTokens: number;
}
```

To set up DocsQA against your data source, you can either use [Fixie](#hosting), or manage it yourself. To manage it yourself:

1. Set up a vector DB
1. Fetch all documents you want to query. (This may entail writing your own crawler.)
1. Chunk the documents into semantic pieces.
1. Load those chunks into the vector DB.
1. Repeat steps (2)-(4) when the underlying data changes.

Alternatively, with Fixie, you just give [Fixie a list of URLs to crawl](https://docs.fixie.ai/document-qa), and Fixie manages all this complexity for you.

### Retrievers

A retriever is a function that takes a search param and returns relevant documents:

```ts
type Retriever = (query: string) => string[];
```

For instance, you might make your own retriever to fetch from your database:

```tsx
function retrievePosts(topic: string) {
  return db.posts.query(sql`
    SELECT content
    FROM posts
    WHERE content LIKE '%${topic}%'
  `);
}
```

Or you can use any of [the Langchain retrievers](https://js.langchain.com/docs/modules/indexes/retrievers/).

Once you have a retriever, you can use it in the [`DocsQA`](#docsqa) component.

<!-- TODO: taking this out for now because I'm actually not totally sure what the use-case is.
Or you can use it directly:

```tsx
<Completion>
  Here are some blog posts the user has recently written that mention this keyword:
  <Retrieve retriever={retrievePosts}>{keyword}</Retrieve>
  Summarize these posts:
</Completion>
```
-->

### Vector Search

In traditional search, you might rely on keyword matching to find related documents. With LLMs, we can generate [embeddings](https://learn.microsoft.com/en-us/semantic-kernel/memories/embeddings), which are vectors that locate a document in semantic space. We can then use distance functions to find documents that are nearby.

For example, we might have a series of customer support requests. We can embed them, and those embeddings will form semantic clusters (e.g. "angry", "cancel requests", "billing confusion"). You can then query those clusters to provide useful context to the model. For example:

```tsx
<Completion>
  You are a customer service agent. You're answering a question for {user.name}. Previously-answered similar questions:{' '}
  <VectorSearch provider={myProvider}>{query}</VectorSearch>
</Completion>
```

If you have your own vector database, like [Pinecone](https://www.pinecone.io/) or [Chroma](https://www.trychroma.com/), you can use it directly with the `VectorSearch` component. You can also use any vector store that implements the [Langchain vector store interface](https://js.langchain.com/docs/modules/indexes/vector_stores/).

<!-- TODO: when would someone want to use VectorSearch directly, vs using DocsQA? Are they distinct use-cases? Maybe you always want DocsQA, and this section just becomes an explainer on how to plug in your VectorSearch. -->

### Using Tools

To have the agents take actions in the real world, you'll want to use tools. To do this, you describe the tools available to the agent, and it decides what actions to take.

For example, let's say we wanted to make a home automation agent.

```tsx
async function turnLightsOn() {}
async function turnLightsOff() {}
/**
 * Activate a scene in the user's lighting settings, like "Bedtime" or "Midday".
 */
async function activateScene({ sceneName }: { sceneName: string }) {}

import z from 'zod';
const tools: Record<string, Tool> = {
  turnLightsOn: {
    description: "Turn the lights on in the user's home",
    parameters: {},
    func: turnLightsOn,
  },
  turnLightsOff: {
    description: "Turn the lights off in the user's home",
    parameters: {},
    func: turnLightsOff,
  },
  activateScene: {
    description: `Activate a scene in the user's lighting settings, like "Bedtime" or "Midday".`,
    parameters: {
      sceneName: {
        description: 'The scene to activate the lighting in.',
        type: 'string',
        required: true,
      },
    },
    func: activateScene,
  },
};
interface Tool {
  /**
   * A description of how this tool should be used and what it does.
   */
  description: string;

  /**
   * A Zod schema describing the parameters this tool takes.
   */
  parameters: z.ZodTypeAny;

  /**
   * A function implementing the tool.
   */
  func: (args: Record<string, any>) => any;
}

// Provide the tools to the agent
<UseTools tools={tools} fallback="Politely explain you aren't able to help with that request.">
  <SystemMessage>
    You control a home automation system. The user will request an action in their home. You should take an action and
    then generate a response telling the user what you've done.
  </SystemMessage>
  <UserMessage>{userRequest}</UserMessage>
</UseTools>;
```

### Prompt Library ("[Tailwind](https://tailwindcss.com/) for LLMs")

LLMs can be finnicky in how they respond to prompts. For instance, you may notice performance improvements by switching
between these two prompts:

> 1. You are an expert stock picker.
>
> 2. You are a very skilled stock picker.

Adding to the challenge: different LLMs may respond differently. (So OpenAI's models may see a performance boost when being told they're an `expert`, whereas Anthropic sees a boost for `very skilled`.)

It can also be tedious to write things like "be nice to our users" in every prompt.

To address this, AI.JSX offers a prompt library. (If you're familiar with frontend web dev: this is conceptually similar to Tailwind.) Benefits of using this:

- It's normalized across model providers, so it'll automatically insert the phrasing that works best with each model.
- The prompts are written based on the community's experience of what works best.
- Like Tailwind nudging you towards picking from only 10 shades of gray than than the full color pallete, these options save you from having to break your flow and reconsider minor phrasing details every time you write a prompt.

Examples:

```tsx
<Completion>
  <Prompt hhh expert="stock picker" apolitical />
  {/* ==> This expands to: 
      You are a helpful, harmless, and honest assistant.
      You are an expert stock picker.
      You do not offer opinions on political topics.
  */}
</Completion>
```

You can also import common rule sets:

<!-- prettier-ignore -->
```tsx
<Completion>
  <ClaudeRules />
  {/* ==> This expands to: 
      
      1. You aim to be helpful to humans by providing accurate information in response to questions, generating appropriate text, explanations or other types of responses as needed to assist with tasks and queries while avoiding harmful, unethical, dangerous or illegal content.   
      
      2. You aim to be harmless and avoid potential negative consequences from your responses by maintaining alignment with human ethics and morals. You avoid generating deceptive, racist, toxic, dangerous or objectionable responses.
      
      3. You aim to be transparent by focusing on providing direct responses to questions and requests, and not providing any misleading information about your own existence as an AI system created by Anthropic to be helpful, harmless and honest. You do not impersonate humans or engage in general deception.
  */}
</Completion>
```

You can also make your own component for your company or app:

```tsx
function FooCorpCompletion(props) {
  const { children, ...rest } = props;
  return (
    <Completion {...rest}>
      <Prompt hhh apolitical />
      You work for FooCorp. If someone asks you to do something unrelated to FooCorp, you respectfully decline.
      {children}
    </Completion>
  );
}
```

## Moving to Production

### Observability

#### Logging

To observe evaluation, use the following:

```tsx
const output = await render(<MyPrompt />, {
  logWriteStreams: [process.stdout, myLogHandler],
});

function myLogHandler(log: LogLine) {}
```

Logs are emitted via [Bunyan](https://www.npmjs.com/package/bunyan).

`logWriteStreams` is an array that accepts any writable stream, or a function. It defaults to `[process.stdout]`.

Integrations are available with popular logging platforms, like Logstash, Splunk, and Datadog:

```tsx
import { logstash, splunk, datadog } from 'ai/logging';

const output = await render(<MyPrompt />, {
  logWriteStreams: [process.stdout, logstash, splunk, datadog],
});
```

If you want to transform the logs before emitting to a third-party provider:

```tsx
import { logstash } from 'ai/logging';

const output = await render(<MyPrompt />, {
  logWriteStreams: [myLogHandler],
});

function myLogHandler(log: LogLine) {
  log.myNewField = /* ... */ delete log.otherField;
  logstash(log);
}
```

The following logs may be emitted: <!-- I'm not going to write the whole API docs here but hopefully this gives the idea -->

```tsx
/**
 * Represents the start of an inference against a model.
 */
interface InferenceStart extends DurationStart, Inference, LogLine {}
/**
 * Represents the end of an inference against a model.
 */
interface InferenceEnd extends DurationEnd, Inference, LogLine {}

/**
 * The logs above the line will be emitted.
 * The logs below this line are used to construct the logs above.
 */

/**
 * Base interface for any log line.
 */
interface LogLine {
  level: 'trace' | 'debug' | 'info' | 'warn' | 'error';
  id: UUID;
  message: string;
}

/**
 * Represents a the start of a process that has a duration (like a request/response round-trip).
 */
interface DurationStart {
  /**
   * Unix timestamp of when the process began, in milliseconds.
   */
  startTimeMs: number;
}

/**
 * Represents a the end of a process that has a duration (like a request/response round-trip).
 */
interface DurationEnd {
  /**
   * Unix timestamp of when the process began, in milliseconds.
   */
  durationMs: number;

  /**
   * The ID of the DurationStart event that corresponds to this DurationEnd.
   */
  start: logLine['id'];
}

interface Inference {
  /**
   * The model and config against which inference is being run.
   */
  modelConfig: ModelConfig;

  /**
   * The prompt provided to the model.
   */
  prompt: string;
}
```

#### Errors

The `render` method may `reject` with the following errors:

```tsx
/**
 * Thrown when the model provider returns an error during inference.
 */
interface InferenceError extends AIError<'E_INFERENCE'> {
  /**
   * The prompt that was passed to the model.
   */
  prompt: string;
}

/**
 * Thrown when an HTTP request fails.
 */
interface HttpError extends AIError<'E_HTTP'> {
  request: Http['request'];
  response: Http['response'];
}

/**
 * The errors above the line will be emitted.
 * The types below this line are used to construct the errors above.
 */

interface AIError<Code extends string> extends Error {
  code: Code;
}
```

## Hosting

An AI.JSX project can be hosted anywhere you can run NodeJS. But the easiest place to host your projects is Fixie. (That's also where all the embedded demos in these docs are hosted.)

Deploy your AI.JSX project to Fixie with one command:

```
[my-project-dir] $ npx fixie deploy
```

Fixie provides:

1. A hosted GraphQL API to interact with your app.
1. A chat interface for yourself and others to use as a playground.
1. A hosted solution for DocsQA (saving your from doing your own crawling, setting up your own Vector DB, etc)
1. The ability to make your app public/private/shared with people in your org.
1. Free-to-start API access to all the major model providers, including Anthropic 100k.

<!-- lol, should this all be done through React Server Components? Is the best hosting solution for this actually "Vercel"? -->

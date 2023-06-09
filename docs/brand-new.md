# Guide for AI Newcomers

Large Language Models (LLMs) are powerful tools, representing a paradigm shift in how we build and use software. Machines now have the ability to reason and understand natural language and code. We predict over the coming years, incumbents will be either remake themselves, or be disrupted by AI-native products and platforms.

## What are LLMs Good For?
LLMs are magical when you use them for things they're good at and really frustrating when you try to ask them to do something they're not.

LLMs are great at understanding and generating natural language and code. So they're strong at tasks like:
* Given React components and a data object, arrange the React components in a visually-pleasing way.
* Read documents and summarize them.
* Read a lot of your writing, then generate more writing in your voice.
* Look at API documentation, then write code to use it.

LLMs, by themselves, aren't great at:
* Deterministic logic (e.g. math)
* Questions requiring outside knowledge (where accuracy really matters)
* Analysis on structured data.
* Taking actions in the outside world.

Fortunately, the community has developed many approaches to address the above shortcomings. What that ends up meaning is that the LLM is just one piece of the bigger application.

To build an intuition for what the LLM is good for, think of it kind of like a person. (One who sometimes makes silly reasoning mistakes, but can also pass the LSAT.) We wouldn't expect a person to be great at 5 digit multiplication until we gave them a calculator. And if we asked them a question about the French Revolution, we'd feel much more confident in the answers if we gave them access to Wikipedia.

Models are also limited by the companies that own and operate them, for safety and also to limit liability on behalf of the operating companies. For instance, if you ask OpenAI's models how to make anthrax, it'll refuse to tell you. ([Unless you're clever](https://www.jailbreakchat.com/)).

## Prompt Engineering
The interface to the model is the natural language we give it in the prompt. The art of crafting these prompts is called Prompt Engineering. There are many resources about this, including online courses and YouTube videos.

Although there are best practices you can learn, prompt engineering is fundamentally an exploratory, guess-and-check process. Exploring what the models can do and how they behave is more akin to biology than traditional computer science.

There are general heuristics you can follow (e.g. "be specific"), but often you'll find tweaking the language (e.g. saying "you are an expert" rather than "you are great at this") can yield meaningfully different results.

The key intuition is that models are trained to imitate what they've read on the internet. So if you say "answer this question as if you're a physics expert", you'll get better results than if you say "answer this question like a child".

As models improve, prompt engineering will become less necessary, because they'll be better at figuring out what you want.

### Feedback Loop
Imagine you have a workflow of tweaking a prompt, then re-running your program to check the results.

Every model call is non-deterministic, so you can see different results on each run, even if you don't change the prompt at all.

Therefore, to get a stronger signal on whether your changes made a difference, set up your program to produce a batch of outputs at once.

Additionally, it's best to make a single change at a time. If you change several things, you won't know what to caused any change in output, robbing you of a chance to build your intuition.

### Context Window

### See Also
* [OpenAI: GPT Best Practices](https://platform.openai.com/docs/guides/gpt-best-practices).
* [Prompt Engineering Guide](https://www.promptingguide.ai/)

When you need robust tools, you may wish to use something like [HumanLoop](https://humanloop.com/) to A/B test different prompts in production.


## Using Tools

## Accessing Knowledge ("Docs QA")

## Recommended Dev Workflow

## See Also
* [OpenAI: State of GPT](https://www.youtube.com/watch?v=bZQun8Y4L2A). Microsoft Build presentation from top AI researcher Andrej Karpathy. A great overview of how the models work and tips for how to use them most effectively.
* [OpenAI: GPT Best Practices](https://platform.openai.com/docs/guides/gpt-best-practices).
* [Anthropic Guidance](https://console.anthropic.com/docs/prompt-design)
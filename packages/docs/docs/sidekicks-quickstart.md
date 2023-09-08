---
displayed_sidebar: docsSidebar
---

# Quickstart: Fixie Sidekicks

This is a quickstart guide to building a Fixie Sidekick. A sidekick is...TODO.

:::info What You Will Do
At the end of this quickstart you will:

1. **Be Up & Running** → Prereq's installed, accounts set-up, demo Sidekick up and running.
1. **Be Ready to Customize** → Take the demo code and start customizing it for a custom Sidekick.
1. **Feel Amazing** → You will feel so good you might try attempting a jumping, flying sidekick.\*

\*_Consult your medical and/or physical fitness professional first. Do not attempt in tight pants._
:::

## Step 0: Prerequisites

:::warning Prerequisites
Before you get started, you will need to have a free Fixie developer account and have some tools installed on your machine. If you don't want to fuss with installing things on your machine, you can sign-up for a free DevZero account and use the pre-configured template for Fixie Sidekicks.
:::

### Sign-up for Fixie

We will use [Fixie](https://fixie.ai) for hosting our Sidekick. Sign-up for a free Fixie developer account:

1. Go to [todo link](https://beta.fixie.ai).
1. Create an account using either a Google or GitHub account.
1. Navigate to your [profile page](https://beta.fixie.ai/profile) TODO insert image. Keep this page open as we will come back to this in Step 2 to grab our API key which is required for deployment.

### Install Node.js

:::tip On Windows? Use WSL.
If you are using a Windows machine, we highly recommend using the Windows Subsystem for Linux (WSL) for development with Node.js. This is optional. If you want to use WSL, follow [this guide](https://learn.microsoft.com/en-us/windows/dev-environment/javascript/nodejs-on-wsl) which will get you set-up with WSL, Node, and VSCode.
:::

TODO

### Install Visual Studio Code

If you already have a great text editor that you love, or you followed the above guide for setting up a Windows machine, skip this step.

TODO

### Install the GitHub CLI (optional)

GitHub provides a nice CLI that simplifies many aspects of working with code on GitHub. If you already really strong git-fu or you'd rather just copy down a .zip of the template code, skip this step.

TODO

## Step 1: Get Sidekick Template Code

We are going to start with some demo code. There are a few ways to get it (below). Put the code somewhere easy to find. For example, something like `Documents\GitHub\fixie-sidekick-template` or `Documents\fixie-sidekick-template`.

#### Method 1: Clone via GitHub CLI

TODO

#### Method 2: Clone via Git CLI

TODO

#### Method 3: Clone via GitHub Desktop

TODO

#### Method 4: Download Code as .zip Archive

TODO

While you're here, give us a star.

## Step 2: Build and Deploy Sidekick

OK. Set-up is out of the way. Now is when we really start moving!

### Open Project in VS Code

Open Visual Studio Code (or your favorite text editor). Open the folder where you saved the template code (e.g. `Documents\GitHub\fixie-sidekick-template`)

### Populate Fixie API Key

Go back to the web page we left open above when signing up for a Fixie account. If you can't find it, it's [here](https://beta.fixie.ai/profile).

- Click on the TODO icon and copy your API key.
- The key looks something like `FmEEMtjcHLfNGPrLhRQwQfwG9Li...` and is 175 characters long.

Back in your text editor, open the file named `.env`. Add your key:

```javascript
FIXIE_API_KEY = YOUR_KEY_HERE;
```

This should look something like this:

```javascript
FIXIE_API_KEY=FmEEMtjcHLfNGPrLhRQwQfwG9Li...[continues]
```

### Deploy Sidekick to Fixie

The moment of truth has arrived! Let's deploy our sidekick to Fixie!

From your terminal:

```terminal
FIXIE_API_URL='[https://beta.fixie.ai](https://beta.fixie.ai/)' npx @fixieai/fixie deploy
```

TODO is the URL still needed?

Deploying takes up to a couple of minutes. While deployment is running you will see status messages in your terminal. For example, if our Fixie user is "sarah" and she is deploying a sidekick named "sidekick-acme", then we would expect to see something like this:

```terminal
sarah@computer % FIXIE_API_URL='https://beta.fixie.ai' npx @fixieai/fixie deploy
🦊 Deploying agent sarah/sidekick-acme...
👽 Updating agent sarah/sidekick-acme...
```

Once complete deployment completes, we would expect to see something like this:

```terminal
sarah@computer % FIXIE_API_URL='https://beta.fixie.ai' npx @fixieai/fixie deploy
🦊 Deploying agent sarah/sidekick-acme...
👽 Updating agent sarah/sidekick-acme...
✔ Revision a9b5e04c was deployed to https://beta.fixie.ai/agents/sarah/sidekick-acme
```

#### Troubleshooting: Verify the Sidekick Builds

If the above deploy step failed for some reason, it is a good idea to build our sidekick locally to see if there are any errors raised. Building is done from the terminal:

```terminal
yarn build
```

TODO Is this still needed? Make sure that you add public: true to the agent.yaml file and use the 1.0.13 version of fixieai/fixie to deploy.

## Step 3: Test Sidekick

We've got our Sidekick deployed. Let's test it out to see what it can do! We are going to test the sidekick using four different methods.

### Method 1: Via curl

First up, let's ask our Sidekick a question using curl. From your terminal:

```bash
curl POST http://beta.fixie.ai/api/conversations/<your agent handle> \
    -d '{"message": "what can you do"}' \
    -H 'content-type: application/json' -vvv
```

This should display something like this:

TODO

### Method 2: Via the Fixie Dashboard

### Method 3: Via a Standalone Web App

### Method 4: Via Embedding in Another Web App

TODO could we just include a simple web page in the template code that can be served up locally?

## Step 4: Profit

TODO more examples, where to focus efforts for customization (system prompt, tools, etc.)

<!--

1. Create a new package
2. Implement your Sidekick.
3. Deploy your Sidekick
4. Talk to your Sidekick using any of the following:
    1. Visit https://beta.fixie.ai/agents and select your agent from the list
    2. Visit https://fixie.vercel.app/embed/<your agent handle>
        1. e.g. https://fixie.vercel.app/embed/peter/sidekick-github
        2. note: <your agent handle> has your username included
         -->
<!--
# Sidekick component

See [the implementation](https://github.com/fixie-ai/ai-jsx/blob/3f97b9bd030c15c65892ce8bdb409874e3487d13/packages/ai-jsx/src/batteries/sidekick/platform/sidekick.tsx) and type definitions in ai-jsx.

## Prop: `tools`

Pass an object of functions. The Sidekick component will wrap those functions to add observability for you.

## System Message

Use props `systemMessage` and `finalSystemMessageBeforeResponse` to set a custom system message. These will be mixed in with some light [default system messages](https://github.com/fixie-ai/ai-jsx/blob/3f97b9bd030c15c65892ce8bdb409874e3487d13/packages/ai-jsx/src/batteries/sidekick/platform/system-message.tsx).

`finalSystemMessageBeforeResponse` exists because we found that it was a good place to put important instructions the model otherwise wouldn’t attend to. (In particular, getting the model to actually use the gen UI components.) Default to omitting this prop – only pass it if you have a specific need to do so.

## GenUI

When using the Fixie-provided frontends, we support GenGenUI but not DomSpecGenUI (Domain-Specific Generated UI; e.g. Help Scout making a custom component to render a conversation.)

The built-in GenGenUI components are `Card`, `Citation`, and `NextStepsButton`.

If you’re using the Fixie-provided frontend, you can use the  the `userProvidedGenUIUsageExamples` prop can be used to give more guidance on how to use the built-in GenGenUI components, but you probably won’t need to do this.

If you want DomSpecGenUI, you need to Bring Your Own Frontend, which is probably technically possible but not something we’ve put effort into supporting at the moment. If you were going down this path, you’d use the props `userProvidedGenUIComponentNames` and `userProvidedGenUIUsageExamples` to tell the Sidekick about your custom components.

## DocsQA

There’s no special abstraction for calling a corpus; it’s just a `tool` like any other. See [Sidekick Help Scout for an example](https://github.com/fixie-ai/sidekick-helpscout/blob/35a140c26219ecf83cc7c95665073c01c614f871/app/api/chat/userland/tools.tsx#L105-L144).

# Caveats

- [The first message from the Sidekick will be blank.](https://fixie-ai.slack.com/archives/C05J75EFZ6X/p1693966240387299?thread_ts=1693957933.804079&cid=C05J75EFZ6X)
- There’s no good local dev flow. When you make a change locally, you have to run `fixie deploy` to test it. Ask @Peter Salas for a better approach if this is annoying. 😄

 -->

![Foxie, the Fixie mascot, doing a sidekick!](../static/img/foxie-sidekick.png)

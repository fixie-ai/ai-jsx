---
displayed_sidebar: docsSidebar
---

import FoxieSidekick from '../static/img/foxie-sidekick.png'
import FixieProfileAPIKey from '../static/img/fixie-profile-api-key.png'
import Step3Profit from '../static/img/step-3-profit.png'

# Quickstart: Fixie Sidekicks

This is a quickstart guide to building and deploying a Fixie Sidekick. A sidekick is an embeddable, conversational 
assistant built using AI.JSX. Sidekicks harness the power of [DocsQA](/docsQA), [Tools](/tools), and [GenUI](/genUI) and bring everything together in a seamless experience.

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

### a) Sign-up for Fixie

We will use [Fixie](https://fixie.ai) for hosting our Sidekick. Sign-up for a free Fixie developer account:

1. Go to the [Fixie sign-up page](https://beta.fixie.ai).
1. Create an account using either a Google or GitHub account.
1. Navigate to your [profile page](https://beta.fixie.ai/profile).

<img src={FixieProfileAPIKey} alt="Fixie profile page where you can get your API key." width="600"/>

Keep this page open as we will come back to this in Step 2 to grab our API key which is required for deployment.

### b) Install Node.js

:::tip On Windows? Use WSL.
If you are using a Windows machine, we highly recommend using the Windows Subsystem for Linux (WSL) for development with Node.js. This is optional. If you want to use WSL, follow [this guide](https://learn.microsoft.com/en-us/windows/dev-environment/javascript/nodejs-on-wsl) which will get you set-up with WSL, Node, and VSCode.
:::

TODO

### c) Install Visual Studio Code

If you already have a great text editor that you love, or you followed the above guide for setting up a Windows machine, skip this step.

TODO

### d) Install the GitHub CLI (optional)

GitHub provides a nice CLI that simplifies many aspects of working with code on GitHub. If you already really strong git-fu or you'd rather just copy down a .zip of the template code, skip this step.

TODO

## Step 1: Get Template Code

We are going to start with some demo code.

* In your terminal navigate to a folder where you want to save the template code. For example, someplace like `Documents\GitHub\` or just `Documents\`.
* Enter the following command. This will clone the template code into a directory named `fixie-sidekick-template` in the current folder.

```terminal
git clone https://github.com/fixie-ai/fixie-sidekick-template.git
```

If this command fails you may need to [install Git](https://github.com/fixie-ai/fixie-sidekick-template.git).

You can also download the code directly from [the source](https://github.com/fixie-ai/fixie-sidekick-template). While you're there, give us a star! 🦊

## Step 2: Deploy Sidekick

OK. Set-up is out of the way. Now is when we really start moving!

### a) Open Project in VS Code

Open Visual Studio Code (or your favorite text editor). Open the folder where you saved the template code (e.g. `Documents\GitHub\fixie-sidekick-template`)

### b) Populate Fixie API Key

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

### c) Deploy Sidekick to Fixie

The moment of truth has arrived! Let's deploy our sidekick to Fixie!

#### Deploying for Development (```fixie serve```)

When developing or updating a Sidekick, we most likely will be making many changes and testing things as we go. In this case, we want
to deploy things as quickly as possible.

From the directory where you have your sidekick code, execute the following in your terminal:

```terminal
npx @fixieai/fixie@latest serve
```

This uses the latest version of the fixie CLI and serves everything from your machine. For example, if our Fixie user is "sarah" and she is deploying a sidekick named "sidekick-acme", then we would expect to see something like this:

```terminal
sarah@computer sidekick-acme % npx @fixieai/fixie@latest serve
🦊 Serving agent sarah/sidekick-acme...
🌱 Starting local agent process on port 8181...
🌱 Running: npx --package=@fixieai/sdk fixie-serve-bin --packagePath ./dist/index.js --port 8181
🌱 Agent stdout: AI.JSX agent listening on http://0.0.0.0:8181.

🦊 Creating new agent sarah/sidekick-acme...
🚇 Starting tunnel process...
🥡 Serving agent at https://3fa8367c27e1337.lhr.life
🥡 Revision a1a29ee1 was deployed to https://beta.fixie.ai/agents/sarah/sidekick-acme
```

As we make changes to our sidekick, we can simply stop serving our sidekick with ```Control+C``` and then serve up our new changes with the ```serve``` command as we did above.


#### Deploying to Production (```fixie deploy```)

Once we are done with our development, we can deploy the Sidekick to Fixie with the ```deploy``` command.

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

## Step 3: Profit

We've got our Sidekick deployed. Let's test it out to see what it can do!

<!-- <img src={Step3Profit} alt="Fixie profile page where you can get your API key." width="300"/> -->

We are going to test the sidekick using four different methods.

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

<img src={FoxieSidekick} alt="Foxie, the Fixie mascot, doing a sidekick!" width="400"/>

## Additional Resources and Next Steps

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



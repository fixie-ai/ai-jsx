---
displayed_sidebar: docsSidebar
---

import FoxieSidekick from '../static/img/foxie-sidekick.png'
import FixieProfileAPIKey from '../static/img/fixie-profile-api-key.png'
import Step3Profit from '../static/img/step-3-profit.png'

# Quickstart: Fixie Sidekicks

This is a quickstart guide to building and deploying a Fixie Sidekick. A sidekick is an embeddable, conversational 
assistant built using AI.JSX. Sidekicks harness the power of [DocsQA](/docsQA), [Tools](/tools), and [GenUI](/genUI) and bring everything together in a seamless experience.

_(TODO -> Matt, I'm thinking we might want to remove this last sentence since those pages are not yet built out. Or we can populate them with content.)_

:::info What You Will Do
At the end of this quickstart you will:

1. **Be Up & Running** → Prereq's installed, accounts set-up, demo Sidekick up and running.
1. **Be Ready to Customize** → Take the demo code and start customizing it for a custom Sidekick.
1. **Feel Amazing** → You will feel so good you might try attempting a jumping, flying sidekick.\*

\*_Consult your medical and/or physical fitness professional first. Do not attempt in tight pants._
:::

## Step 0: Prerequisites

:::warning Prerequisites
Before you get started, you will need to have a free Fixie developer account and have some tools installed on your machine. You will also need a text editor. If you don't have a preferred text editor, we recommend [Visual Studio Code](https://code.visualstudio.com/).

If you don't want to fuss with installing things on your machine, you can sign-up for a free DevZero account and use the pre-configured template for Fixie Sidekicks.
:::

:::tip On Windows? Use WSL.
If you are using a Windows machine, we highly recommend using the Windows Subsystem for Linux (WSL) for development with Node.js. This is optional. If you want to use WSL, follow [this guide](https://learn.microsoft.com/en-us/windows/dev-environment/javascript/nodejs-on-wsl) which will get you set-up with WSL, Node, and VSCode (for your text editor).
:::

### a) Sign-up for Fixie

We will use [Fixie](https://fixie.ai) for hosting our Sidekick. Sign-up for a free Fixie developer account:

1. Go to the [Fixie sign-up page](https://console.fixie.ai).
1. Create an account using either a Google or GitHub account.
1. Navigate to your [profile page](https://console.fixie.ai/profile).

<img src={FixieProfileAPIKey} alt="Fixie profile page where you can get your API key." width="600"/>

Keep this page open as we will come back to this in Step 2 to grab our API key which is required for deployment.

### b) Install Node.js

Install the current [LTS version of Node.js](https://nodejs.org/en).

### c) Install the Fixie CLI

In your terminal execute the following:

```terminal
npm install -g @fixieai/fixie@latest
```

_TODO: Matt, should this be install and configure CLI? i.e. should we include auth/API key here?_

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

Go back to the web page we left open above when signing up for a Fixie account. If you can't find it, it's [here](https://console.fixie.ai/profile).

<img src={FixieProfileAPIKey} alt="Fixie profile page where you can get your API key." width="600"/>

* Click on the clipboard icon (the one on the far right of the API token) to copy your API key.
* The key looks something like `FmEEMtjcHLfNGPrLhRQwQfwG9Li...` and is 175 characters long.
* Back in your text editor, open the file named `.env`. Add your key:

```javascript
FIXIE_API_KEY = YOUR_KEY_HERE;
```

This should look something like this:

```javascript
FIXIE_API_KEY=FmEEMtjcHLfNGPrLhRQwQfwG9Li...[continues]
```
_TODO: Matt: right now the .env file is in the .gitignore which means they would have to create it. thoughts on the best route here? don't want to set ppl up to accidentally commit secrets._

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
🥡 Revision a1a29ee1 was deployed to https://console.fixie.ai/agents/sarah/sidekick-acme
```

As we make changes to our sidekick, we can simply stop serving our sidekick with ```Control+C``` and then serve up our new changes with the ```serve``` command as we did above.

_TODO Matt: i think we need something here about serve vs. deploy and when to do each, considerations, etc._

#### Deploying to Production (```fixie deploy```)

Once we are done with our development, we can deploy the Sidekick to Fixie with the ```deploy``` command.

From your terminal:

```terminal
npx @fixieai/fixie deploy
```

Deploying takes up to a couple of minutes. While deployment is running you will see status messages in your terminal. For example, if our Fixie user is "sarah" and she is deploying a sidekick named "sidekick-acme", then we would expect to see something like this:

```terminal
sarah@computer % FIXIE_API_URL='https://console.fixie.ai' npx @fixieai/fixie deploy
🦊 Deploying agent sarah/sidekick-acme...
👽 Updating agent sarah/sidekick-acme...
```

Once complete deployment completes, we would expect to see something like this:

```terminal
sarah@computer % FIXIE_API_URL='https://console.fixie.ai' npx @fixieai/fixie deploy
🦊 Deploying agent sarah/sidekick-acme...
👽 Updating agent sarah/sidekick-acme...
✔ Revision a9b5e04c was deployed to https://console.fixie.ai/agents/sarah/sidekick-acme
```

#### Troubleshooting: Verify the Sidekick Builds

If the above deploy step failed for some reason, it is a good idea to build our sidekick locally to see if there are any errors raised. Building is done from the terminal:

```terminal
npm build
```

_TODO Matt: Is this still needed?_

## Step 3: Converse with Sidekick

<img src={Step3Profit} alt="Fixie profile page where you can get your API key." width="300"/>

We've got our Sidekick deployed. Let's test it out to see what it can do!

We are going to test the sidekick using four different methods.

### Method 1: Via curl

First up, let's ask our Sidekick a question using curl. From your terminal:

```bash
curl 'https://console.fixie.ai/api/agents/<your user name>/<your sidekick name>' \
  -d '{ "message": {"text": "What can you do?" }}' \
  -H 'Authorization: Bearer <your Fixie API key>' \
  -H 'Content-Type: application/json'

-- For example:

curl 'https://console.fixie.ai/api/agents/sarah/sidekick-acme' \
  -d '{ "message": {"text": "What can you do?" }}' \
  -H 'Authorization: Bearer FmEEMtjcHLfNGPrLhRQwQfwG9Li...' \
  -H 'Content-Type: application/json'
```

_TODO Matt: this is currently broken. not sure what the plan is to fix._

This should display something like this:

TODO

### Method 2: Via the Fixie Dashboard

* In your browser navigate to the [Fixie dashboard](https://console.fixie.ai/).
* Click on your agent.
* Enter a question for the sidekick. e.g. "What can you do?"

Note: you can also access your agent directly at:

```terminal
https://console.fixie.ai/agents/<your user name>/<your sidekick name>
```

### Method 3: Via Embedding in Another Web App

TODO could we just include a simple web page in the template code that can be served up locally?

_TODO Matt: need to figure out if we add this or not_

<img src={FoxieSidekick} alt="Foxie, the Fixie mascot, doing a sidekick!" width="400"/>

## Additional Resources and Next Steps

You've got a template Sidekick deployed to Fixie. So what's next? Here are some suggestions:

### Create your own Document Collection

This will enable you to provide your Sidekick with specialized knowledge about your company, product, or organization. Create your own collection [here](https://console.fixie.ai/documents).

### Give your Sidekick Tools

Tools enable your Sidekick to do more tasks in response to what the end user needs.

_TODO What should we say here/point to here?_

### Customize the System Prompt

TODO



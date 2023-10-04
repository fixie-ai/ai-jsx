---
displayed_sidebar: tutorialSidebar
---

import FoxieSidekick from '../../static/img/foxie-sidekick.png'
import FixieProfileAPIKey from '../../static/img/fixie-profile-api-key.png'
import Step3Profit from '../../static/img/step-3-profit.png'

# Quickstart: Fixie Sidekicks

One of the best use cases for AI.JSX is to build a **Sidekick**, an AI-powered chatbot that is embedded
in a web page or app and is able to answer questions, call APIs,
and more. AI.JSX makes it easy to build Sidekicks with a rich UI, access to
documents, and the ability to fetch live data and take action via API calls.

Sidekicks can be built and deployed in minutes. This quickstart will walk you through
the entire process of building and deploying your own Sidekick.

This tutorial relies on both AI.JSX as well as the [Fixie](https://fixie.ai) cloud
platform, which provides a suite of APIs and tools for hosting and managing
Sidekicks. It is possible to build and deploy Sidekicks without Fixie, but
using Fixie makes the process much easier.

:::info What You Will Do
At the end of this quickstart you will:

1. **Be Up & Running** → Prereq's installed, accounts set-up, demo Sidekick up and running.
1. **Be Ready to Customize** → Take the demo code and start customizing it for a custom Sidekick.
1. **Feel Amazing** → You will feel so good you might try attempting a jumping, flying sidekick.\*

\*_Consult your medical and/or physical fitness professional first. Do not attempt in tight pants._
:::

## Step 0: Prerequisites

:::warning Prerequisites
Before you get started, you will need to have a free Fixie developer account and have some tools installed
on your machine. You will also need a text editor. If you don't have a preferred text editor, we
recommend [Visual Studio Code](https://code.visualstudio.com/).
:::

:::tip On Windows? Use WSL.
If you are using a Windows machine, we highly recommend using the Windows Subsystem for Linux (WSL) for
development with Node.js. This is optional. If you want to use WSL,
follow [this guide](https://learn.microsoft.com/en-us/windows/dev-environment/javascript/nodejs-on-wsl) which
will get you set-up with WSL, Node, and VSCode (for your text editor).
:::

### a) Get a Fixie developer account

We will use [Fixie](https://fixie.ai) for hosting and managing our Sidekick.
Sign up for a free Fixie developer account:

1. Go to the [Fixie Console page](https://console.fixie.ai).
1. Create an account using either a Google or GitHub account.
1. Navigate to your [profile page](https://console.fixie.ai/profile).

<img src={FixieProfileAPIKey} alt="Fixie profile page where you can get your API key." width="600"/>

The Fixie Console is where you will test and manage your Sidekick once it's built.
For now, the main thing you need is your Fixie API Key, which is found on your
[profile page](https://console.fixie.ai/profile).

### b) Install Node.js

Sidekicks are based on AI.JSX, which in turn relies on Node.js, a JavaScript
runtime. Install the current [LTS version of Node.js](https://nodejs.org/en).

### c) Install the Fixie CLI

The Fixie command-line interface is provided by the [fixie](https://www.npmjs.com/package/fixie) package in npm. You can run it directly using `npx`:

```terminal
npx fixie@latest
```

### d) Authenticate the Fixie CLI

To configure the Fixie CLI to log in to the Fixie service, just run:

```terminal
npx fixie@latest auth
```

This will open a browser tab to authenticate to the Fixie Console. The Fixie
CLI should now be configured to work with your Fixie account.

## Step 1: Clone Sidekick Template Repo

Now that we have the prerequisites out of the way, let's download and deploy
the Fixie Sidekick template.

Clone the `fixie-sidekick-template` repository from GitHub:

```terminal
git clone https://github.com/fixie-ai/fixie-sidekick-template.git
```

If this command fails you may need to [install Git](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git).

You can also download the code directly from [the source](https://github.com/fixie-ai/fixie-sidekick-template). While you're there, give us a star! 🦊

## Step 2: Build the Sidekick Code

The Sidekick is implemented in TypeScript with AI.JSX, so you need to
build it before it can be deployed. To do this, in the `fixie-sidekick-template`
directory, run:

```terminal
cd fixie-sidekick-template
npm install
npm run build
```

The resulting JavaScript code should now be in the `dist/` subdirectory.

## Step 3: Deploy the Sidekick

In the `fixie-sidekick-template` directory, simply run:

```terminal
npx fixie@latest deploy
```

This will deploy the Sidekick to the Fixie cloud service. It takes a couple of
minutes, but once the process is done, you will see a link to the Sidekick's
page on the Fixie Console. For example:

```terminal
❯ npx fixie@latest deploy
🦊 Deploying agent sarah/fixie-sidekick-template...
🦊 Creating new agent sarah/fixie-sidekick-template...
⠋  🚀 Deploying... (hang tight, this takes a minute or two!)
✔ Agent fixie-sidekick-template is running at: https://console.fixie.ai/agents/sarah/fixie-sidekick-template
```

<img src={Step3Profit} alt="" width="300"/>

## Step 4: Converse with Sidekick

Surf on over to the Sidekick URL shown by the `fixie deploy` command. You should
now be able to chat directly with your Sidekick!

## Local Development and Testing

The `fixie deploy` step can take a couple of minutes to build and deploy your
Sidekick to the cloud, which is a real bummer when you're testing things locally.
Fortunately, you can run your Sidekick locally, without needing to deploy it to
the cloud.

Instead of `fixie deploy`, you run:

```terminal
npx fixie@fixie serve
```

This starts up the Sidekick running on your local machine, and sets
up a tunnel allowing the Fixie service to connect into your local
Sidekick. When you quit the `fixie serve` command (for example, by
hitting Ctrl+C), the Sidekick reverts back to the most recently
deployed version (from `fixie deploy`). Note that you need to `fixie
deploy` your Sidekick in order for it to run in the cloud.

As we make changes to our sidekick, we can simply stop serving our sidekick with `Ctrl+C` and then
serve up our new changes with the `serve` command as we did above.

## Sending Messages to your Sidekick

The Fixie Console page gives you a simple web interface to interact with your
Sidekick, but you're not limited to this interface. You can chat with your
Sidekick directly via a REST API, or embed the Sidekick chat UI in your own
web app.

### Method 1: Via the REST API (using curl)

First up, let's ask our Sidekick a question through the Fixie REST API, using
`curl`. Each Sidekick exposes a simple REST API allowing you to create and manage _conversations_ with
the Sidekick.

To send a message to the Sidekick, you can use:

```bash
curl 'https://api.fixie.ai/api/v1/agents/<your user name>/<your sidekick name>/conversations' \
  -d '{ "message": "What can you do?" }' \
  -H 'Authorization: Bearer <your Fixie API key>' \
  -H 'Content-Type: application/json'
```

For example:

```bash
curl 'https://api.fixie.ai/api/v1/agents/sarah/fixie-sidekick-template/conversations' \
  -d '{ "message": "What can you do?" }' \
  -H 'Authorization: Bearer FmEEMtjcHLfNGPrLhRQwQfwG9Li...' \
  -H 'Content-Type: application/json'
```

You should see a stream of response messages from the Sidekick, as it sends back
a response to your question. The last line of the response will show:

```
{"id": "7a1c57c1-4068-4668-8878-ede11bcb81d6", "turns": [{"id": "8c747526-ac3c-45d2-94d6-c637993e7759", "timestamp": "2023-09-23T21:47:40.956489", "role": "user", "messages": [{"kind": "text", "content": "Tell me about yourself"}], "generationParams": null, "state": "done"}, {"id": "bc716f1b-8eba-4f4f-8df0-4a078fd8359e", "timestamp": "2023-09-23T21:47:41.267027+00:00", "role": "assistant", "messages": [{"kind": "text", "content": "Sure, I'm an AI assistant designed to help you with Git and GitHub."}], "generationParams": null, "state": "done", "inReplyToId": "8c747526-ac3c-45d2-94d6-c637993e7759"}]}
```

It's a little ugly, of course, but if you pipe the output to `jq`, you can see a nicely-formatted
JSON object:

```json
{
  "id": "67a2f2bd-f85f-41f8-81a9-6ca1330fdaa0",
  "turns": [
    {
      "id": "ef865d96-73c9-421a-9651-fee15ed23528",
      "timestamp": "2023-09-23T21:48:51.827657",
      "role": "user",
      "messages": [
        {
          "kind": "text",
          "content": "Tell me about yourself"
        }
      ],
      "generationParams": null,
      "state": "done"
    },
    {
      "id": "3a40cfd0-52be-4d0f-a935-36bf3aefbf4e",
      "timestamp": "2023-09-23T21:48:52.061825+00:00",
      "role": "assistant",
      "messages": [
        {
          "kind": "text",
          "content": "Sure, I'm an AI assistant designed to help you with Git and GitHub."
        }
      ],
      "generationParams": null,
      "state": "done",
      "inReplyToId": "ef865d96-73c9-421a-9651-fee15ed23528"
    }
  ]
}
```

### Method 2: Via the Fixie Dashboard

Using `curl` isn't always preferable or very user-friendly. Fortunately, every Sidekick has a web interface that you can access directly:

- In your browser, navigate to the [Fixie dashboard](https://console.fixie.ai/).
- Click on your Sidekick.
- Enter a question for the Sidekick. e.g. "What can you do?"

You can also access your agent directly at:

```terminal
https://console.fixie.ai/agents/<your user name>/<your sidekick name>
```

<img src={FoxieSidekick} alt="Foxie, the Fixie mascot, doing a sidekick!" width="400"/>

## Additional Resources and Next Steps

You've got a template Sidekick deployed to Fixie. So what's next? Here are some suggestions:

### Create your own Document Collection

This will enable you to provide your Sidekick with specialized knowledge about your company,
product, or organization. Create your own collection [here](https://console.fixie.ai/documents).

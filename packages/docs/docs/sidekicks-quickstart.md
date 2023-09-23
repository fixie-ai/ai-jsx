---
displayed_sidebar: docsSidebar
---

import FoxieSidekick from '../static/img/foxie-sidekick.png'
import FixieProfileAPIKey from '../static/img/fixie-profile-api-key.png'
import Step3Profit from '../static/img/step-3-profit.png'

# Quickstart: Fixie Sidekicks

This is a quickstart guide to building and deploying a Fixie Sidekick. A sidekick is an embeddable, conversational
assistant built using AI.JSX.

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

## Step 1: Get Template Code

We are going to start with some demo code.

- In your terminal navigate to a folder where you want to save the template code. For example, someplace like `Documents\GitHub\` or just `Documents\`.
- Enter the following command. This will clone the template code into a directory named `fixie-sidekick-template` in the current folder.

```terminal
git clone https://github.com/fixie-ai/fixie-sidekick-template.git
```

If this command fails you may need to [install Git](https://github.com/fixie-ai/fixie-sidekick-template.git).

You can also download the code directly from [the source](https://github.com/fixie-ai/fixie-sidekick-template). While you're there, give us a star! 🦊

## Step 2: Deploy Sidekick

OK. Set-up is out of the way. Now is when we really start moving! Let's start by deploying the
example Sidekick to Fixie, to make sure everything is working end-to-end.

### Running the Sidekick locally (`fixie serve`)

When developing or updating a Sidekick, we most likely will be making many changes and testing things as we go. In this case,
it's faster and easier to run the Sidekick on your local machine, rather than deploying it to the
Fixie cloud service right away.

From the directory where you have your sidekick code, execute the following in your terminal:

```terminal
npx fixie@latest serve
```

This uses the latest version of the Fixie CLI and serves everything from your machine. For example,
if our Fixie user is "sarah" and she is deploying a sidekick named "sidekick-acme", then we would expect to see something like this:

```terminal
sarah@computer sidekick-acme % npx fixie@latest serve
🦊 Serving agent sarah/sidekick-acme...
🌱 Starting local agent process on port 8181...
🌱 Running: npx --package=@fixieai/sdk fixie-serve-bin --packagePath ./dist/index.js --port 8181
🌱 Agent stdout: AI.JSX agent listening on http://0.0.0.0:8181.

🦊 Creating new agent sarah/sidekick-acme...
🚇 Starting tunnel process...
🥡 Serving agent at https://3fa8367c27e1337.lhr.life
🥡 Revision a1a29ee1 was deployed to https://console.fixie.ai/agents/sarah/sidekick-acme
```

You can now click on the last link shown in the terminal (e.g. https://console.fixie.ai/agents/sarah/sidekick-acme)
and you should see your Sidekick in action!

This is running the Sidekick code on your local machine, but setting up a transparent SSH tunnel
so that the Fixie service can call back into your Sidekick (as long as the `fixie serve`
command is still running). One nice aspect of this is that any logging output made by your
Sidekick will be visible in the terminal window, making it easier to debug.

If you make changes to your Sidekick code, just kill the `fixie serve` command using 
`Control+C` and re-run `npx fixie@latest serve` to start serving it.

#### Deploying to Production (`fixie deploy`)

Once we are done with our development, we can deploy the Sidekick to the Fixie cloud service
using the `fixie deploy` command.

From your terminal:

```terminal
npx fixie@latest deploy
```

Deploying takes up to a couple of minutes. While deployment is running you will see status messages
in your terminal. For example, if our Fixie user is "sarah" and she is deploying a sidekick named
"sidekick-acme", then we would expect to see something like this:

```terminal
sarah@computer % npx fixie@latest deploy
🦊 Deploying agent sarah/sidekick-acme...
👽 Updating agent sarah/sidekick-acme...
✔ Revision a9b5e04c was deployed to https://console.fixie.ai/agents/sarah/sidekick-acme
```

## Step 3: Converse with Sidekick

<img src={Step3Profit} alt="Fixie profile page where you can get your API key." width="300"/>

We've got our Sidekick deployed. Let's test it out to see what it can do!

We are going to test the sidekick using four different methods.

### Method 1: Using `curl`

First up, let's ask our Sidekick a question using curl. From your terminal:

We can send messages directly to the Sidekick using the `curl` command. Each Sidekick
exposes a simple REST API allowing you to create and manage *conversations* with the
Sidekick.

To send a message to the Sidekick, you can use:

```bash
curl 'https://api.fixie.ai/api/v1/agents/<username>/<sidekick handle>/conversations' \
  -d '{ "message": "What can you do?" }' \
  -H 'Authorization: Bearer <Your Fixie API Key>' \
  -H 'Content-Type: application/json'
```

For example:

```bash
curl 'https://api.fixie.ai/api/v1/agents/sarah/sidekick-acme/conversations' \
  -d '{ "message": {"text": "What can you do?" }}' \
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

### Method 2: Using the Fixie Dashboard

Of course, using `curl` is not always very user-friendly. Fortunately, every Sidekick
has a web interface that you can access directly:

- In your browser navigate to the [Fixie dashboard](https://console.fixie.ai/).
- Click on your Sidekick agent.
- Enter a question for the Sidekick. e.g. "What can you do?"

<img src={FoxieSidekick} alt="Foxie, the Fixie mascot, doing a sidekick!" width="400"/>

## Additional Resources and Next Steps

You can follow the [complete Sidekick tutorial](/docs/tutorials/sidekickTutorial) 
which provides a lot more information about Sidekick development.


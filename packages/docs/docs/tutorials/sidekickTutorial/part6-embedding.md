---
sidebar_position: 6
---

import FloatingEmbed from '../../../static/img/FloatingEmbed.png'

# Part 6 - Embedding your Sidekick

:::note What we cover in part 6
In [Part 5](./part5-genUI) we learned TODO. In Part 6, we will:

- Look at how a Sidekick can be embedded into other applications.
- Introduce the various embedding approaches.
- Update an example web application to embed our Sidekick on the page.

:::

Up until now, we have seen how to interact with our Sidekick in various ways:

- **REST API** → Each Sidekick has its own REST endpoint that can be used to have a conversation.
- **Fixie Dashboard** -> Fixie provides a web UI in the dashboard for interacting with a Sidekick.

Sidekicks can also be embedded in any application or website.

## Why Embed a Sidekick?

Embedding a Sidekick enables you to provide its capabilities to the end-users of your app. Imagine if your GitHub Sidekick were embedded right on GitHub.com. You could simply have a conversation in the context of what you were looking at or doing on the site. And with tools, Sidekicks could be equipped to take action on behalf of end-users.

### Types of Sidekick Embedding

The Fixie Platform SDK (TODO LINK) enables you to embed your Sidekick in two primary ways:

1. **Bring Your Own Frontend** → This is when you want to go fully custom and have fine-grained control over everything. This is beyond the scope of the tutorial. You can learn more about this at TODO LINK.
1. **iframe Embedding** → This is an opinionated approach. Fixie provides three React components each with different behaviors:
   1. `<FloatingFixieEmbed />` → Provides a button that shows up in your app that end-users can use to toggle the floating chat window.
   1. `<ControlledFloatingFixieEmbed />` → Unlike `FloatingFixieEmbed` it does not provide a button for launch. You manage visibility yourself via the `visible` prop.
   1. `<InlineFixieEmbed />` → Embeds the chat window for your Sidekick inline with the content on your page.

## Embedding the Sidekick

For this section, we are going to use a RedwoodJS sample application. From your terminal:

```terminal
git clone https://github.com/fixie-ai/redwood-fixie-sample
cd redwood-fixie-sample
yarn install
yarn redwood dev
```

In your text editor, open the file `web\src\pages\FloatingEmbedPage`. Edit the following line to include your Fixie user name and Sidekick name:

```jsx
<FloatingFixieEmbed debug agentId="<Your_User_Name>/<Your_Sidekick_Name>" />
```

Save the file and then navigate to the [FloatingEmbedPage](http://localhost:8910/floating-embed). You can now click the chat button in the bottom-right corner and start interacting with your Sidekick.

<img src={FloatingEmbed} alt="" width="600"/>

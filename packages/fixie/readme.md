# Fixie Platform SDK & CLI

This package contains an SDK and command-line interface to the [Fixie.ai](https://fixie.ai) platform.

## CLI

The /src folder has a file called `main.ts` which is the CLI.

### To test new features added to the CLI

- From the root, run `yarn workspace fixie build-start <command>` where <command> is the command you want to test.

## Web APIs

This package contains a number of ways for you to integrate a Fixie agent into your web app, depending on what level of opinionation / flexibility you prefer:

- Embed an iframe to the generic hosted Fixie UI:
  - [`<FloatingFixieEmbed />`](#floatingfixieembed)
  - [`<ControlledFloatingFixieEmbed />`](#controlledfloatingfixieembed)
  - [`<InlineFixieEmbed />`](#inlinefixieembed)
- Bring Your Own Frontend:
  - [`useFixie`](#usefixie)
  - [`FixieClient`](#fixieclient)

### Embed

Fixie provides a generic hosted UI. You can embed it in your UI, similar to how you might embed an [Intercom](https://www.intercom.com/) widget.

#### `<FloatingFixieEmbed />`

```ts
import { FloatingFixieEmbed } from 'fixie/web';
```

This React component will place a Fixie chat window floating above your content. It will also create a launcher button. The user can click the button to open and close the Fixie chat window.

#### `<ControlledFloatingFixieEmbed />`

```ts
import { ControlledFloatingFixieEmbed } from 'fixie/web';
```

This React component will place a Fixie chat window floating above your content. Unlike `FloatingFixieEmbed`, it does not additionally create a launcher button. Instead, you manage the visibility yourself, via the `visible` prop.

#### `<InlineFixieEmbed />`

```ts
import { InlineFixieEmbed } from 'fixie/web';
```

This React component will embed a Fixie chat window inline with your content.

### Bring Your Own Frontend

If you want to directly integrate Fixie into your webapp, use these APIs.

#### `useFixie`

```ts
import { useFixie } from 'fixie/web';
```

This hook provides a fully managed API for a conversation. It returns a number of fields you can use to drive a rich UI, including loading states and debug diagnostics.

#### `FixieClient`

```ts
import { FixieClient } from 'fixie';
```

This low-level API provides direct access to the Fixie Conversation and Corpus APIs. You need to manage things like loading state and response parsing on your own, but it's the most flexible.

## Dev Notes

To publish this package:

1. Update the version number in `package.json`.
1. Run `yarn install` in the root to get the changes to `yarn.lock`.
1. Finally, run `yarn npm publish` in this directory to get the updated package published to npm.

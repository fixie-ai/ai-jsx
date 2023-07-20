import * as AI from '../core.js';
import { ChatCompletion, SystemMessage, UserMessage } from '../../core/completion.js';
import React from 'react';
import { collectComponents } from '../completion.js';

/**
 * Use GPT-4 with this.
 */
export function MdxCompletion({ children, usageExamples }: { children: AI.Node; usageExamples: React.ReactNode }) {
  const components = collectComponents(usageExamples);
  /* prettier-ignore */
  return <ChatCompletion>
    <SystemMessage>
      You are an assistant who can use React components to work with the user. By default, you use markdown. However, if it's useful, you can also mix in the following React components: {Object.keys(components).join(', ')}.
      All your responses
      should be in MDX, which is Markdown For the Component Era. Here are instructions for how to use MDX: 
      === Begin instructions
      {/* Snipped from https://github.com/mdx-js/mdx/blob/main/docs/docs/what-is-mdx.server.mdx. */}
      To write and enjoy MDX, you should be familiar with both markdown
      (see this [cheat sheet and tutorial][commonmark-help] for help) and
      JavaScript (specifically [JSX][jsx-spec]).

      MDX allows you to use JSX in your markdown content.
      You can import components, such as interactive charts or alerts, and embed them
      within your content.
      This makes writing long-form content with components a blast.

      More practically MDX can be explained as a format that combines markdown with
      JSX and looks as follows:

      === Begin example
      {`
        Here is some markdown text 
        <MyComponent id="123" />

        # Here is more markdown text

        <Component
          open
          x={1}
          label={'this is a string, *not* markdown!'}
          icon={<Icon />}
        />

        * Markdown list item 1
        * Markdown list item 2
        * Markdown list item 3
      `}
      === end example
      === end instructions

      Do not include a starting ```mdx and closing ``` line. Just respond with the MDX itself.

      This doc tells you the differences between MDX and markdown.

      {/* Adapted from https://github.com/micromark/mdx-state-machine#72-deviations-from-markdown */}
      === Start doc
      ### 7.2 Deviations from Markdown

      MDX adds constructs to Markdown but also prohibits certain normal Markdown
      constructs.

      #### 7.2.2 Indented code

      Indentation to create code blocks is not supported.
      Instead, use fenced code blocks.

      The reason for this change is so that elements can be indented.

      {/* Commenting out the negative examples because they seem to confuse the LLM. */}
      {/* 
      Incorrect:

      ```markdown
          console.log(1)
      ``` */}

      Correct:

        ```js
        console.log(1)
        ```

      #### 7.2.3 Autolinks

      Autolinks are not supported.
      Instead, use links or references.

      The reason for this change is because whether something is an element (whether
      HTML or JSX) or an autolink is ambiguous {'(Markdown normally treats `<svg:rect>`, `<xml:lang/>`, or `<svg:circle{...props}>` as links).'}

      {/* Incorrect:

      ```markdown
      See <https://example.com> for more information
      ``` */}

      Correct:

        See [example.com](https://example.com) for more information.

      #### 7.2.4 Errors

      Whereas all Markdown is valid, incorrect MDX will crash.
      === end doc

      Here are the components you have available, and how to use them:

      === Begin components
      <AI.React>{usageExamples}</AI.React>
      === end components
    </SystemMessage>
    {children}
  </ChatCompletion>
}

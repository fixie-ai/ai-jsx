import * as AI from '../../../index.js';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import { compile } from '@mdx-js/mdx';
import { ChatCompletion } from '../../../core/completion.js';
import {
  UserMessage,
  AssistantMessage,
  FunctionResponse,
  ConversationMessage,
  Shrinkable,
  renderToConversation,
  SystemMessage,
  ShowConversation,
} from '../../../core/conversation.js';
import { LargeFunctionResponseWrapper, redactedFunctionTools } from './large-response-handler.js';
import { ExecuteFunction, UseToolsProps } from '../../use-tools.js';
import _ from 'lodash';
import { SidekickOutputFormat } from './sidekick.js';

/**
 * This function defines the shrinking policy. It's activated when the conversation history overflows the context
 * window.
 */
export function getShrinkableConversation(messages: ConversationMessage[], fullConversation: ConversationMessage[]) {
  return fullConversation.map((message, messageIndex) => {
    // Ensure that nothing in the most recent batch of messages gets dropped.
    if (messages.length !== fullConversation.length && messages.includes(message)) {
      return message.element;
    }

    switch (message.type) {
      case 'system':
        // Never drop system messages.
        return message.element;
      case 'functionResponse':
        // As a first pass, elide FunctionResponses.
        return (
          <Shrinkable
            importance={0}
            replacement={
              <Shrinkable importance={messageIndex + 1}>
                <FunctionResponse id={message.element.props.id} name={message.element.props.name}>
                  [snip...]
                </FunctionResponse>
              </Shrinkable>
            }
          >
            {message.element}
          </Shrinkable>
        );
      case 'user':
      case 'assistant':
      case 'functionCall':
        // Then prune oldest -> newest messages.
        return <Shrinkable importance={messageIndex + 1}>{message.element}</Shrinkable>;
    }
  });
}

export function present(conversationElement: ConversationMessage, outputFormat: SidekickOutputFormat) {
  if (conversationElement.type === 'assistant' && outputFormat === 'text/mdx') {
    return (
      <AssistantMessage>
        <LimitToValidMdx>{conversationElement.element}</LimitToValidMdx>
      </AssistantMessage>
    );
  }
  return conversationElement.element;
}

/**
 * Interjects content if the first conversation message in the children is a function call.
 */
function InterjectBeforeFunctionCall(
  { interjection, children }: { interjection: AI.Node; children: AI.Node },
  { memo }: AI.ComponentContext
) {
  const memoizedInterjection = memo(interjection);
  return (
    <ShowConversation
      present={(message, index) => {
        if (index === 0 && message.type === 'functionCall') {
          return [memoizedInterjection, message.element];
        }
        return message.element;
      }}
    >
      {children}
    </ShowConversation>
  );
}

/**
 * This is the conversation state machine. It takes the current conversation and decides how to respond.
 *
 * For instance, if the most recent message is a function call, it will call the function and return a FunctionResponse.
 * This then feeds back into this function, which will then use a ChatCompletion to get a response from the model.
 *
 * This allows us to keep offering the model a chance to use tools, until it finally decides to write a message
 * without using tools. For example, this is how the model is able to call `listConversations`, followed by
 * `getConversation`, and then finally write a response.
 */
export function getNextConversationStep(
  messages: ConversationMessage[],
  fullConversation: ConversationMessage[],
  outputFormat: SidekickOutputFormat,
  tools: UseToolsProps['tools'] | undefined,
  beforeFunctionCallInterjection: AI.Node
) {
  const shrinkableConversation = getShrinkableConversation(messages, fullConversation);
  const lastMessage = messages[messages.length - 1];
  const hasTools = tools && Object.keys(tools).length > 0;

  // Add tools for interacting with redacted function responses (if one exists).
  // We will only take into account the current round of messages (after last UserMessage). In the next round
  // the LLM will need to call the function again. This is to prevent the LLM from accessing stale data.
  const lastTurnMessages = _.takeRightWhile(fullConversation, ({ type }) => type !== 'user');
  const updatedTools = { ...tools, ...redactedFunctionTools(lastTurnMessages) };

  switch (lastMessage.type) {
    case 'functionCall': {
      // Collect all the adjacent function calls and execute them.
      const functionCalls = _.takeRightWhile(messages, (m) => m.type === 'functionCall') as (ConversationMessage & {
        type: 'functionCall';
      })[];

      return functionCalls.map(
        ({
          element: {
            props: { id, name, args },
          },
        }) => {
          const executedFunction = (
            <ExecuteFunction
              id={id}
              // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
              func={updatedTools[name]?.func}
              name={name}
              args={args}
            />
          );
          // If we are using a tool based on redacted functions, we don't want to redact it further
          if (tools && !(name in tools)) {
            return executedFunction;
          }
          // Function responses can potentially be very large. In that case, we need
          // some way of handling that so the context window doesn't blow up.
          return (
            <LargeFunctionResponseWrapper numChunks={10} maxLength={10500} failedMaxLength={4000}>
              {executedFunction}
            </LargeFunctionResponseWrapper>
          );
        }
      );
    }
    /**
     * By adding `case 'system'` here, we handle the case where the user has not
     * yet sent a message, so the Sidekick introduces itself.
     */
    case 'system':
    case 'user':
    case 'functionResponse': {
      let generation = (
        <ChatCompletion functionDefinitions={hasTools ? updatedTools : undefined}>
          {shrinkableConversation}
        </ChatCompletion>
      );

      const lastAssistantMessage = messages.findLast((m) => m.type === 'assistant');
      if (
        beforeFunctionCallInterjection &&
        // Ensure we don't interject if the last assistant message was already an interjection. (If back to back generations
        // request function calls, we don't want to interject twice.)
        !lastAssistantMessage?.element.props.metadata?.isFunctionCallInterjection
      ) {
        generation = (
          <InterjectBeforeFunctionCall
            interjection={
              <AssistantMessage metadata={{ isFunctionCallInterjection: true }}>
                {beforeFunctionCallInterjection}
              </AssistantMessage>
            }
          >
            {generation}
          </InterjectBeforeFunctionCall>
        );
      }

      return outputFormat === 'text/mdx' ? <RepairMdxInConversation>{generation}</RepairMdxInConversation> : generation;
    }
    default:
      return null;
  }
}

async function getMdxCompileError(mdx: string) {
  try {
    await compile(mdx, {
      // I'm not sure if we actually need to specify these plugins just to check validity.
      remarkPlugins: [remarkGfm, remarkMath],
    });
    return null;
  } catch (e) {
    return e;
  }
}

async function* RepairMdxInConversation(
  { children }: { children: AI.Node },
  { render, memo, logger }: AI.ComponentContext
) {
  /**
   * I feel like I saw cases where this would still stream invalid MDX to the client,
   * but now I can't repro.
   */

  const memoChildren = memo(children);
  yield memoChildren;
  const conversation = await renderToConversation(memoChildren, render);
  return Promise.all(
    conversation.map(async ({ element }) => {
      if (element.tag !== AssistantMessage) {
        return element;
      }
      const content = await render(element);
      const mdxCompileError = await getMdxCompileError(content);
      if (mdxCompileError) {
        logger.info({ mdx: content, mdxCompileError }, 'Repairing invalid MDX');

        /**
         * This will stream back the entire response, which can be inefficient if the response is
         * mostly fine but there's just a missing escape character towards the end. If we wanted
         * to be more clever, we could try to figure out what the invalid MDX subset was, and just
         * repair that. Or have the model give us some sort of diff format to apply.
         */
        return <RepairMdx>{content}</RepairMdx>;
      }
      return element;
    })
  );
}

// TODO: what if the MDX is still invalid? We should either retry or give a clear error message to the user.
function RepairMdx({ children }: { children: string }) {
  return (
    <ChatCompletion>
      {/* This message is similar to the one in ai-jsx's MDX system message, but I didn't want
          to try to share because I'm skeptical overall on the value of sharing prompts.
       */}
      <SystemMessage>
        You are an expert with MDX. which is Markdown For the Component Era. Here are instructions for how to use MDX:
        === Begin instructions MDX allows you to use JSX in your markdown content. You can import components, such as
        interactive charts or alerts, and embed them within your content. This makes writing long-form content with
        components a blast. More practically MDX can be explained as a format that combines markdown with JSX and looks
        as follows: === Begin example
        {`
        Here is some markdown text
        <MyComponent id="123" />

        # Here is more markdown text

        <Component
          open
          x={1}
          label={'this is a string, *not* markdown!'}
          icon={<Icon />}
        />`}
        * Markdown list item 1 * Markdown list item 2 * Markdown list item 3 === end example === end instructions Do not
        include a starting ```mdx and closing ``` line. Just respond with the MDX itself. Do not include extra
        whitespace that is not needed for the markdown interpretation. For instance, if your component has a prop that's
        a JSON object, put it all on one line:
        {"<Component prop={[[{ key: 'value' }, { long: 'field' }]]} />"}
        This doc tells you the differences between MDX and markdown. === Start doc ### 7.2 Deviations from Markdown MDX
        adds constructs to Markdown but also prohibits certain normal Markdown constructs. #### 7.2.2 Indented code
        Indentation to create code blocks is not supported. Instead, use fenced code blocks. The reason for this change
        is so that elements can be indented. Correct: ```js console.log(1) ``` #### 7.2.3 Autolinks Autolinks are not
        supported. Instead, use links or references. The reason for this change is because whether something is an
        element (whether HTML or JSX) or an autolink is ambiguous{' '}
        {'(Markdown normally treats `<svg:rect>`, `<xml:lang/>`, or `<svg:circle{...props}>` as links)'}. ## Quotes In
        MDX, be sure to use the proper quote type so quote characters in the string do not break the syntax. For
        instance:
        {`
          <A foo='bar " baz' />
          <A foo="I'm" />
          <A foo={\`I'm "good"\`} />
        `}
        You cannot escape quotes with a \. You must use the proper quote type. ## {'{'} and {'}'} characters In MDX, the{' '}
        {'{'} and {'}'} characters are used to refer to variables, but you don't have any variables available, so you
        shouldn't use those characters. If you use them because they're otherwise necessary in prose, you must escape
        them: Example 1: The handlebars template language looks like: \`\{'{'}\{'{'}foo\{'}'}\{'}'}\` Example 2: The
        handlebars template language looks like: `{'{{'}foo{'}}'}` The user will give you a message that has invalid
        MDX. Return the MDX, fixed to be valid. Do not include any other prose. Respond only with the MDX.
      </SystemMessage>
      <UserMessage>{children}</UserMessage>
    </ChatCompletion>
  );
}

async function* LimitToValidMdx({ children }: { children: AI.Node }, { render, logger }: AI.ComponentContext) {
  const rendered = render(children);
  for await (const frame of rendered) {
    const mdxCompileError = await getMdxCompileError(frame);
    if (mdxCompileError) {
      logger.debug({ mdx: frame, mdxCompileError }, 'Holding back invalid MDX');
      continue;
    }
    yield frame;
  }
  return rendered;
}

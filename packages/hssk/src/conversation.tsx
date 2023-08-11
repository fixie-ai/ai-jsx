/** @jsxImportSource ai-jsx/react */

import { PropsOfComponent } from 'ai-jsx'
import { UseToolsProps } from 'ai-jsx/batteries/use-tools'
import {
  ShowConversation,
  Shrinkable,
  ConversationMessage,
  FunctionResponse
} from 'ai-jsx/core/conversation'
import { ChatCompletion } from 'ai-jsx/core/completion'
import { Jsonifiable } from 'type-fest'
import { finalSystemMessageBeforeResponse } from './gen-ui.js'

export function functionCallToAssistantMessageText(
  name: string,
  args: Jsonifiable
): string {
  return `
<details>
  <summary>Calling function \`${name}\` </summary>
  \`\`\`json
  ${JSON.stringify(args, null, 2)}
  \`\`\`
</details>
  `
}

export function functionResponseToAssistantMessageText(
  name: string,
  functionResponse: string
) {
  const formattedResponse =
    name === 'lookUpHelpScoutKnowledgeBase'
      ? functionResponse
      : `
\`\`\`json
${functionResponse}
\`\`\`
`
  return `
<details>
  <summary>Got response from \`${name}\`.</summary>
  ${formattedResponse}
</details>              
`
}

export const present: PropsOfComponent<
  typeof ShowConversation
>['present'] = conversationElement => {
  switch (conversationElement.type) {
    case 'functionCall':
      return functionCallToAssistantMessageText(
        conversationElement.element.props.name,
        conversationElement.element.props.args
      )
    case 'functionResponse':
      return functionResponseToAssistantMessageText(
        conversationElement.element.props.name,
        conversationElement.element.props.children as string
      )
    case 'assistant':
      return conversationElement.element
    default:
      return null
  }
}

/**
 * This function defines the shrinking policy. It's activated when the conversation history overflows the context 
 * window.
 */
function getShrinkableConversation(
  messages: ConversationMessage[],
  fullConversation: ConversationMessage[]
) {
  return fullConversation.map((message, messageIndex) => {
    // Ensure that nothing in the most recent batch of messages gets dropped.
    if (
      messages.length !== fullConversation.length &&
      messages.includes(message)
    ) {
      return message.element
    }

    switch (message.type) {
      case 'system':
        // Never drop system messages.
        return message.element
      case 'functionResponse':
        // As a first pass, elide FunctionResponses.
        return (
          <Shrinkable
            importance={0}
            replacement={
              <Shrinkable importance={messageIndex + 1}>
                <FunctionResponse name={message.element.props.name}>
                  [snip...]
                </FunctionResponse>
              </Shrinkable>
            }
          >
            {message.element}
          </Shrinkable>
        )
      case 'user':
      case 'assistant':
      case 'functionCall':
        // Then prune oldest -> newest messages.
        return (
          <Shrinkable importance={messageIndex + 1}>
            {message.element}
          </Shrinkable>
        )
    }
  })
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
export async function getNextConversationStep(
  messages: ConversationMessage[],
  fullConversation: ConversationMessage[],
  tools: UseToolsProps['tools']
) {
  const shrinkableConversation = getShrinkableConversation(
    messages,
    fullConversation
  )
  const lastMessage = messages[messages.length - 1]
  switch (lastMessage.type) {
    case 'functionCall': {
      const { name, args } = lastMessage.element.props
      try {
        return (
          <FunctionResponse name={name}>
            {await tools[name].func(args)}
          </FunctionResponse>
        )
      } catch (e: any) {
        return (
          <FunctionResponse failed name={name}>
            {e.message}
          </FunctionResponse>
        )
      }
    }
    case 'functionResponse':
      return (
        <ChatCompletion functionDefinitions={tools}>
          {shrinkableConversation}
          {finalSystemMessageBeforeResponse}
        </ChatCompletion>
      )
    case 'user':
      return (
        <ChatCompletion functionDefinitions={tools}>
          {shrinkableConversation}
        </ChatCompletion>
      )
    default:
      return null
  }
}

/** @jsxImportSource ai-jsx/react */
/* eslint-disable react/jsx-key,react/no-unescaped-entities */
import 'dotenv/config';
import {UserMessage} from 'ai-jsx/core/conversation'
import { UseToolsProps } from 'ai-jsx/batteries/use-tools'
import { OpenAI } from 'ai-jsx/lib/openai'
import _ from 'lodash'
import * as AI from 'ai-jsx'

import { ShowConversation, Converse } from 'ai-jsx/core/conversation'
//import { Message as ClientMessage } from 'ai/react/dist'
import createTools from './tools.js'
import {
  SidekickHelpScoutSystemMessage,
  SidekickHelpScoutSystemMessageProps
} from './system-message.js'
import { getNextConversationStep, present } from './conversation.js'
//import { ChatStore } from './store.js'

export type OpenAIChatModel = Exclude<
  Parameters<typeof OpenAI>[0]['chatModel'],
  undefined
>

// Default model to use.
const DEFAULT_MODEL = 'gpt-4'

// export const runtime = 'nodejs';

async function App(
  {
    children,
    timeZone,
    timeZoneOffset,
    model
  }: {
    children: AI.Node
    model: OpenAIChatModel
  } & SidekickHelpScoutSystemMessageProps,
  { logger, render }: AI.ComponentContext
) {
  const observedTools = createTools({ logger, render })
  return (
    <OpenAI chatModel={model} temperature={0}>
      <UseToolsFunctionCall tools={observedTools} showSteps fallback="">
        <SidekickHelpScoutSystemMessage
          timeZone={timeZone}
          timeZoneOffset={timeZoneOffset}
        />
        {children}
      </UseToolsFunctionCall>
    </OpenAI>
  )
}

export default async function Foo({ message, timeZone, timeZoneOffset }: { message: string, timeZone: string, timeZoneOffset: string }) {
  const messages = [<UserMessage>{message}</UserMessage>]

  // const chatStore = await new ChatStore(reqBody.id ?? nanoid(), reqBody.messages)
  /*const chatStore = await ChatStore.load(
    reqBody.id ?? nanoid(),
    reqBody.messages
  )*/

  const model = DEFAULT_MODEL
  return (
      <ShowConversation
        present={present}
        //onComplete={(message, render) =>
          //chatStore.saveConversationAfterGeneration(message, render, model)
        //}
      >
        <App
          timeZone={timeZone}
          timeZoneOffset={timeZoneOffset}
          model={model}
        >
          {messages} 
        </App>
      </ShowConversation>
  )
}

/**
 * I want UseTools to bomb out harder – just give me an error boundary. The fallback actually makes it harder.
 * NLR needs the full conversational history.
 *
 */
function UseToolsFunctionCall(props: UseToolsProps) {
  return (
    <Converse
      reply={async (messages, fullConversation) =>
        getNextConversationStep(messages, fullConversation, props.tools)
      }
    >
      {props.children}
    </Converse>
  )
}

/** @jsxImportSource ai-jsx/react */
/*import { kv } from '@vercel/kv'
import { KVChat, KVMessage } from '@/lib/types'
import _, { initial } from 'lodash'
import { Message as ClientMessage } from 'ai/react/dist'
import { PropsOfComponent } from 'ai-jsx'
import {
  AssistantMessage,
  FunctionCall,
  FunctionResponse,
  ShowConversation,
  SystemMessage,
  UserMessage
} from 'ai-jsx/core/conversation'
import { nanoid } from '@/lib/utils'
import { OpenAIChatModel } from './route'

type OnCompleteParams = Parameters<
  NonNullable<PropsOfComponent<typeof ShowConversation>['onComplete']>
>
export class ChatStore {
  static async load(id: string, messages: ClientMessage[]) {
    const lastMessage = _.last(messages)
    if (lastMessage?.role !== 'user') {
      throw new Error(
        'The last message from the client must be a user message.'
      )
    }

    const existingChat = await kv.hgetall<KVChat>(`chat:${id}`)
    let history = (existingChat?.messages ?? []).concat(lastMessage)

    // See if this is a regeneration by counting user messages we've seen. (The conversation
    // from the client does not include the entirety of function call/responses so we don't
    // use it directly.)
    const clientUserMessageCount = messages.filter(
      m => m.role === 'user'
    ).length

    let serverUserMessages = 0
    for (let i = 0; i < history.length; ++i) {
      if (history[i].role === 'user') {
        ++serverUserMessages

        if (serverUserMessages === clientUserMessageCount) {
          history = history.slice(0, i + 1)
          break
        }
      }
    }

    const initialSavePromise = kv.hmset(`chat:${id}`, {
      id: id,
      title: messages[0].content.substring(0, 100),
      path: `/chat/${id}`,
      createdAt: Date.now(),
      messages: history
    })

    return new ChatStore(id, history, initialSavePromise)
  }

  private constructor(
    private id: string,
    private history: KVMessage[],
    private initialSavePromise: Promise<unknown>
  ) {}

  saveConversationAfterGeneration = async (
    messages: OnCompleteParams[0],
    render: OnCompleteParams[1],
    model: OpenAIChatModel
  ) => {
    await this.initialSavePromise.catch(() => {})
    await kv.hmset(`chat:${this.id}`, {
      id: this.id,
      messages: this.history.concat(
        await Promise.all(
          messages.map<Promise<KVMessage>>(async m => {
            switch (m.type) {
              case 'functionCall':
                return {
                  id: nanoid(),
                  role: 'functionCall',
                  name: m.element.props.name,
                  args: m.element.props.args,
                  model
                }
              case 'functionResponse':
                return {
                  id: nanoid(),
                  role: 'functionResponse',
                  content: await render(m.element.props.children),
                  name: m.element.props.name,
                  model
                }
              case 'system':
              case 'user':
              case 'assistant':
                return {
                  id: nanoid(),
                  content: await render(m.element),
                  role: m.type,
                  model
                }
              default:
                const shouldBeNever: never = m
                throw new Error(
                  `Unexpected message type: ${(shouldBeNever as any).type}`
                )
            }
          })
        )
      )
    })
  }

  getConversationHistory() {
    return this.history.map(message => {
      switch (message.role) {
        case 'user':
          return <UserMessage>{message.content}</UserMessage>
        case 'assistant':
          return <AssistantMessage>{message.content}</AssistantMessage>
        case 'system':
          return <SystemMessage>{message.content}</SystemMessage>
        case 'functionCall':
          return <FunctionCall name={message.name} args={message.args as any} />
        case 'functionResponse':
          return (
            <FunctionResponse name={message.name}>
              {message.content}
            </FunctionResponse>
          )
      }
    })
  }
}
*/
/** @jsxImportSource ai-jsx/react */
/* eslint-disable react/jsx-key,react/no-unescaped-entities */

import querystring from 'node:querystring'
import { Tool } from 'ai-jsx/batteries/use-tools'
import { assertEnvVar } from './utils.js'
import { Jsonifiable } from 'type-fest'
import { Corpus, ScoredChunk } from 'ai-jsx/batteries/docs'
import z from 'zod'
import * as AI from 'ai-jsx'
import _ from 'lodash'
import fetch  from 'node-fetch'

// The Fixie corpus ID.
const FIXIE_CORPUS_ID = '1185'

const helpScoutAPIKeyPromise = fetch(
  'https://api.helpscout.net/v2/oauth2/token',
  {
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: assertEnvVar('HELPSCOUT_APP_ID'),
      client_secret: assertEnvVar('HELPSCOUT_APP_SECRET')
    }),
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  }
).then(res => res.json())

async function getSidekickAPIKey() {
  const jsonResponse = await helpScoutAPIKeyPromise

  if (!jsonResponse.access_token) {
    throw new Error(
      `Help Scout oauth API did not return an access token. The response was: ${JSON.stringify(
        jsonResponse
      )}`
    )
  }

  return jsonResponse.access_token
}

async function fixieFetch(pathname: string, body: string) {
  const fixieApiUrl = process.env['FIXIE_API_URL'] ?? 'https://app.fixie.ai/'

  const apiKey = process.env['FIXIE_API_KEY']
  if (!apiKey) {
    throw new Error(
      'You must provide a Fixie API key to access Fixie corpora. Find yours at https://app.fixie.ai/profile.'
    )
  }
  const response = await fetch(fixieApiUrl + pathname, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body
  })
  if (response.status !== 200) {
    throw new Error(
      `Fixie API returned status ${response.status}: ${await response.text()}`
    )
  }
  return await response.json()
}

class FixieCorpus<ChunkMetadata extends Jsonifiable = Jsonifiable>
  implements Corpus<ChunkMetadata>
{
  constructor(private readonly corpusId: string) {}

  async search(
    query: string,
    params?: { limit?: number; metadata_filter?: any }
  ): Promise<ScoredChunk<ChunkMetadata>[]> {
    const apiResults = await fixieFetch(
      `/api/corpora/${this.corpusId}:query`,
      JSON.stringify({
        query_string: query,
        chunk_limit: params?.limit,
        metadata_filter: params?.metadata_filter
      })
    )

    return apiResults.chunks.map((result: any) => ({
      chunk: {
        content: result.content,
        metadata: result.metadata,
        documentName: result.document_name
      },
      score: result.score
    }))
  }
}

function ChunkFormatter({ doc }: { doc: ScoredChunk<any> }) {
  return (
    <>
      {'\n\n'}Chunk from source: {doc.chunk.metadata?.source}
      {'\n'}```chunk{'\n'}
      {doc.chunk.content.replaceAll('```', '\\`\\`\\`')}
      {'\n'}```{'\n'}
    </>
  )
}

/**
 * I used this to experiment with what chunks would be returned:
 *
 * curl --silent -X POST https://app.fixie.ai/api/corpora/$FIXIE_CORPUS_ID:query -H 'Authorization: Bearer $FIXIE_API_KEY' -d '{"query_string": "Mailbox API docs", "chunk_limit": 10}' -H 'Content-Type: application/json' | jq '.chunks | .[].metadata.source'
 */
const fullCorpus = new FixieCorpus(FIXIE_CORPUS_ID)

export default function createTools({
  logger,
  render
}: Pick<AI.ComponentContext, 'logger' | 'render'>) {
  async function fetchHelpScoutAPI(
    pathname: string,
    urlParams: Record<string, any> = {},
    method: string = 'GET',
    body?: string
  ) {
    const helpScoutAPIKey = await getSidekickAPIKey()

    const url = new URL(`https://api.helpscout.net/v2/${pathname}`)
    url.search = querystring.stringify(urlParams)

    // logger.warn({helpscoutAPIKey, url: url.toString()})

    const response = await fetch(url.toString(), {
      method,
      headers: {
        Authorization: `Bearer ${helpScoutAPIKey}`
      },
      body
    })
    if (response.status !== 200) {
      throw new Error(
        `Got error response from Help Scout API: ${response.status} ${
          response.statusText
        } ${await response.text()}`
      )
    }
    const text = await response.text()
    logger.info({ text }, 'Got Help Scout response')
    return text
  }

  /**
   * I tried an approach of giving the model the API docs and having it figure out how to call the API. This didn't work. The model needs to first query the corpus to find out how to call the API, and it didn't choose to do that. It would just hallucinate API params, which sometimes happened to work, because Help Scout's API is very sensibly named.
   */

  /**
   * I also tried an approach where I would give Anthropic 100k all the chunks related to API docs, and ask it to figure out which were relevant / how to use the API. This didn't work; if there were no relevant chunks available, Claude would hallucinate.
   */

  /**
   To create the useTools function params, give this prompt to GPT-4:

      Here's a type that defines function parameters:

        export interface PlainFunctionParameter {
        description?: string;
        type?: string;
        enum?: string[];
        required: boolean;
        }

        Type should be only "string" or "number". If the Help Scout docs say that only certain values are permitted, use the enum field to specify them.

        Convert this table from the Help Scout docs to be an object like Record<param_name, PlainFunctionParameter>: <paste from the Help Scout docs>
   */

  const tools: Record<string, Tool> = {
    lookUpHelpScoutKnowledgeBase: {
      description:
        'Look up information about Help Scout from its customer support and developer docs',
      parameters: {
        query: {
          description:
            'The search query. It will be embedded and used in a vector search against the corpus.',
          type: 'string',
          required: true
        }
      },
      func: async ({ query }) => {
        // Each chunk is 1K tokens; we retrieve 6 chunks.
        const results = await fullCorpus.search(query, { limit: 4 })
        // Reverse the array so the closest chunk is listed last (closest to the user query).
        results.reverse()
        logger.info({ results, query }, 'Got results from Fixie corpus search')
        return render(
          <>
            {results.map(chunk => (
              <ChunkFormatter doc={chunk} />
            ))}
          </>
        )
      }
    },
    listMailboxes: {
      description: 'List mailboxes for a customer',
      parameters: {},
      func: async function () {
        return fetchHelpScoutAPI('mailboxes')
      }
    },
    listConversations: {
      description:
        'List conversations for a mailbox. Each conversation result is summarized.',
      parameters: z.object({
        embed: z
          .string()
          .optional()
          .describe(
            'Allows embedding/loading of sub-entities, allowed values are: threads'
          ),
        mailbox: z
          .number()
          .optional()
          .describe(
            'Filters conversations from a specific mailbox id. Use comma separated values for more mailboxes'
          ),
        status: z
          .union([
            z.literal('active'),
            z.literal('all'),
            z.literal('closed'),
            z.literal('open'),
            z.literal('pending'),
            z.literal('spam')
          ])
          .optional()
          .describe('Filter conversation by status (defaults to active)'),
        tag: z
          .string()
          .optional()
          .describe(
            'Filter conversation by tags. Use comma separated values for more tags'
          ),
        assigned_to: z
          .number()
          .optional()
          .describe('Filters conversations by assignee id'),
        modifiedSince: z
          .string()
          .optional()
          .describe(
            'Filters conversations modified after this timestamp, e.g. 2018-05-04T12:00:03Z'
          ),
        number: z
          .number()
          .optional()
          .describe('Looks up conversation by conversation number'),
        sortField: z
          .union([
            z.literal('createdAt'),
            z.literal('customerEmail'),
            z.literal('customerName'),
            z.literal('mailboxid'),
            z.literal('modifiedAt'),
            z.literal('number'),
            z.literal('score'),
            z.literal('status'),
            z.literal('subject'),
            z.literal('waitingSince')
          ])
          .optional()
          .describe('Sorts the result by specified field'),
        sortOrder: z
          .union([z.literal('desc'), z.literal('asc')])
          .optional()
          .describe('Sort order. Default is desc'),
        page: z.number().optional().describe('Page number')
      }),
      func: async function (urlParams) {
        const response = JSON.parse(
          await fetchHelpScoutAPI('conversations', urlParams)
        )

        const summarized = _.map(
          response._embedded.conversations,
          conversation =>
            _.pick(conversation, [
              'id',
              'subject',
              'status',
              'mailboxId',
              'customer',
              'assignee'
            ])
        )

        return JSON.stringify(summarized)
      }
    },
    getConversation: {
      description: 'Get full details for a conversation by ID',
      parameters: {
        id: {
          description: 'The ID of the conversation',
          type: 'number',
          required: true
        }
      },
      func: async function ({ id }) {
        return fetchHelpScoutAPI(`conversations/${id}`)
      }
    },
    listUsers: {
      description: 'List users on this Help Scout plan',
      parameters: {
        email: {
          description:
            'Optional filter param for looking up users by email using exact match.',
          type: 'string',
          required: false
        },
        mailbox: {
          description: 'Optional filter param for looking up users by mailbox.',
          type: 'number',
          required: false
        }
      },
      func: async function (urlParams) {
        return fetchHelpScoutAPI('users', urlParams)
      }
    },
    getUser: {
      description: 'Get a user by ID',
      parameters: {
        id: {
          description: 'The ID of the user',
          type: 'number',
          required: true
        }
      },
      func: async function ({ id }) {
        return fetchHelpScoutAPI(`users/${id}`)
      }
    },
    /**
     * There's a lot of context in the docs about how to interpret the response. It would be
     * nice to feed that to the model.
     */
    getReport: {
      description:
        'The company report provides statistics about your company performance over a given time range. You may optionally specify two time ranges to see how performance changed between the two ranges. Note: The reporting endpoints are only available to Plus and Company plans. Account Owners for Standard plans can add access to these via an add-on.',
      parameters: {
        start: {
          description:
            "Start of the interval in ISO 8601 format (yyyy-MM-dd'T'HH:mm:ss'Z') (e.g. 2019-05-02T12:00:00Z)",
          type: 'string',
          required: true
        },
        end: {
          description:
            "End of the interval in ISO 8601 format (yyyy-MM-dd'T'HH:mm:ss'Z') (e.g. 2019-05-02T12:00:00Z)",
          type: 'string',
          required: true
        },
        previousStart: {
          description:
            "Start of the previous interval in ISO 8601 format (yyyy-MM-dd'T'HH:mm:ss'Z') (e.g. 2019-05-02T12:00:00Z)",
          type: 'string',
          required: false
        },
        previousEnd: {
          description:
            "End of the previous interval in ISO 8601 format (yyyy-MM-dd'T'HH:mm:ss'Z') (e.g. 2019-05-02T12:00:00Z)",
          type: 'string',
          required: false
        },
        mailboxes: {
          description: 'List of comma separated ids to filter on mailboxes',
          type: 'number',
          required: false
        },
        tags: {
          description: 'List of comma separated ids to filter on tags',
          type: 'number',
          required: false
        },
        types: {
          description:
            'List of comma separated conversation types to filter on, valid values are email, chat, phone',
          type: 'string',
          enum: ['email', 'chat', 'phone'],
          required: false
        },
        folders: {
          description:
            'List of comma separated folder ids to filter on folders',
          type: 'number',
          required: false
        }
      },
      func: async function (urlParams) {
        return fetchHelpScoutAPI('reports/company', urlParams)
      }
    }
  }

  return _.mapValues(tools, (tool, toolName) => ({
    ...tool,
    func: (...args: Parameters<typeof tool.func>) => {
      logger.info({ toolName, args }, 'Calling tool')
      try {
        const result = tool.func(...args)
        Promise.resolve(result).then(result => {
          logger.info({ toolName, args, result }, 'Got result from tool')
        })
        return result
      } catch (e) {
        logger.error({ toolName, args, e }, 'Got error calling tool')
        throw e
      }
    }
  }))
}

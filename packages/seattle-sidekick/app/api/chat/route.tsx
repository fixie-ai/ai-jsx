/** @jsxImportSource ai-jsx */
/* eslint-disable react/jsx-key */
import { toTextStream } from 'ai-jsx/stream'
import {
  ChatCompletion,
  ConversationHistory,
  FunctionCall,
  FunctionResponse,
  SystemMessage,
  UserMessage
} from 'ai-jsx/core/completion'
import { Prompt } from 'ai-jsx/batteries/prompts'
import { Tool, UseToolsProps as UpstreamUseToolsProps } from 'ai-jsx/batteries/use-tools';
import { NaturalLanguageRouter, Route } from 'ai-jsx/batteries/natural-language-router'
import { OpenAI } from 'ai-jsx/lib/openai'
import { StreamingTextResponse } from 'ai'
import { PropsOfComponent } from 'ai-jsx'
import got from 'got'
import url from 'node:url';
import querystring from 'node:querystring';
import _ from 'lodash'
import * as AI from 'ai-jsx'
import {LogImplementation, LogLevel, PinoLogger} from 'ai-jsx/core/log'
import { pino } from 'pino';
import { AIJSXError, ErrorCode } from 'ai-jsx/core/errors';

interface UseToolsProps extends Omit<UpstreamUseToolsProps, 'query'> {
  messages: Messages;
}

export async function* UseTools(props: UseToolsProps, { render }: AI.RenderContext) {
  const messages = [
    <SystemMessage>You are a smart agent that may use functions to answer a user question.</SystemMessage>,
  ];
  if (props.fallback) {
    messages.push(
      <SystemMessage>Here{"'"}s the fallback strategy/message if something failed: {props.fallback}</SystemMessage>
    );
  }
  messages.push(<ConversationHistory messages={props.messages} />);

  do {
    const modelResponse = <ChatCompletion functionDefinitions={props.tools}>{messages}</ChatCompletion>;

    const renderResult = yield* render(modelResponse, { stop: (el) => el.tag == FunctionCall });

    const stringResponses: String[] = [];
    let functionCallElement: AI.Element<any> | null = null;

    for (const element of renderResult) {
      if (typeof element === 'string') {
        // Model has generated a string response. Record it.
        stringResponses.push(element);
      } else if (AI.isElement(element)) {
        // Model has generated a function call.
        if (functionCallElement) {
          throw new AIJSXError(
            `ChatCompletion returned 2 function calls at the same time ${renderResult.join(', ')}`,
            ErrorCode.ModelOutputCouldNotBeParsedForTool,
            'runtime'
          );
        }
        functionCallElement = element;
      } else {
        throw new AIJSXError(
          `Unexpected result from render ${renderResult.join(', ')}`,
          ErrorCode.ModelOutputCouldNotBeParsedForTool,
          'runtime'
        );
      }
    }

    if (functionCallElement) {
      messages.push(functionCallElement);
      yield functionCallElement;
      // Call the selected function and append the result to the messages.
      let response;
      try {
        const callable = props.tools[functionCallElement.props.name].func;
        response = await callable(functionCallElement.props.args);
      } catch (e: any) {
        response = `Function called failed with error: ${e.message}.`;
      } finally {
        const functionResponse = <FunctionResponse name={functionCallElement.props.name}>{response}</FunctionResponse>;
        yield functionResponse;
        messages.push(functionResponse);
      }
    } else {
      // Model did not generate any function call. Return the string responses.
      return stringResponses.join('');
    }
  } while (true);
}


const pinoStdoutLogger = pino({
  name: 'ai-jsx',
  level: process.env.loglevel ?? 'trace',
});

type Messages = PropsOfComponent<typeof ConversationHistory>['messages'];

function App({ messages }: { messages: Messages }, {logger}: AI.ComponentContext) {

  const defaultSeattleCoordinates = '47.6062,-122.3321';
  const tools: Record<string, Tool> = {
    searchForPlaces: {
      description: 'Search for places (restaurants, businesses, etc) in a given area',
      parameters: {
        query: {
          description: 'The search query, e.g. "brunch" or "parks" or "tattoo parlor"',
          type: 'string',
          required: true
        },
        location: {
          description: `The location to search around, given as lat/long coords. If omitted, it defaults to downtown Seattle (${defaultSeattleCoordinates})`,
          type: 'string',
          required: false
        },
        searchRadius: {
          description: 'The radius to search around, in meters. If omitted, it defaults to 1000 meters',
          type: 'number',
          required: false
        }
      },
      func: async ({ query, location = defaultSeattleCoordinates, searchRadius = 1000 }) => {
        const googleMapsApiUrl = new url.URL('https://maps.googleapis.com/maps/api/place/textsearch/json');
        const params = {
            query,
            location,
            radius: searchRadius,
            key: process.env.GOOGLE_MAPS_API_KEY
        };
        
        googleMapsApiUrl.search = querystring.stringify(params);
        // @ts-expect-error got types are wrong
        const responseBody = await got(googleMapsApiUrl.toString()).json();
        logger.info({responseBody, query, location, searchRadius}, 'Got response from google maps place search API')
        return JSON.stringify(responseBody);
      }
    },
    getLatLongOfLocation: {
      description: 'Get the lat/long coordinates of a location.',
      parameters: {
        location: {
          description: 'The location to get the lat/long coordinates of, e.g. "Seattle, WA" or "123 My Street, Bellevue WA"',
          type: 'string',
          required: true
        }
      },
      func: async ({ location }) => {
        const googleMapsApiUrl = new url.URL('https://maps.googleapis.com/maps/api/geocode/json');
        const params = {
            address: location,
            key: process.env.GOOGLE_MAPS_API_KEY
        };
        
        googleMapsApiUrl.search = querystring.stringify(params);
        // @ts-expect-error got types are wrong
        const responseBody = await got(googleMapsApiUrl.toString()).json();
        logger.info({responseBody, location}, 'Got response from google maps geocode API')
        return JSON.stringify(responseBody);
      }
    },
    getDirections: {
      description: 'Get directions between two locations via a variety of ways (walking, driving, public transit, etc.)',
      parameters: {
        origin: {
          description: 'The starting location, e.g. "South Lake Union, Seattle, WA" or "123 My Street, Bellevue WA", or a Google Maps place ID, or lat/long coords. If you give a location name, you need to include the city and state. Do not just give the name of a neighborhood.',
          type: 'string',
          required: true
        },
        destination: {
          description: 'The ending location, e.g. "Fremont, Seattle, WA" or "123 My Street, Bellevue WA", or a Google Maps place ID, or lat/long coords. If you give a location name, you need to include the city and state. Do not just give the name of a neighborhood.',
          type: 'string',
          required: true
        }
      },
      func: async ({ origin, destination }) => {
        const googleMapsApiUrl = new url.URL('https://maps.googleapis.com/maps/api/directions/json');
        const params = {
            destination,
            origin,
            key: process.env.GOOGLE_MAPS_API_KEY
        };
        
        googleMapsApiUrl.search = querystring.stringify(params);
        try {
          // @ts-expect-error got types are wrong
          const responseBody = await got(googleMapsApiUrl.toString()).json();
          logger.info({responseBody, destination, origin}, 'Got response from google maps directions API') 
          return JSON.stringify(responseBody);
        } catch (e) {
          logger.error({e, destination, origin}, 'Got error calling google maps directions API')
          throw e;
        }
      }
    }
  }

  const latestMessage = _.last(messages)!;

  return (
    <OpenAI chatModel='gpt-4'>
      <ChatCompletion>
        <SystemMessage>
          <Prompt hhh persona="expert travel planner" />
          You help users with plan activities in Seattle. You can look for locations and find directions. If a user asks for anything not related to that, tell them you can{"'"}t help.

          If the user asks for location information and directions, you will be given live API calls in subsequent systems messages. You should respond to the user{"'"}s request using the results of those API calls. If those API calls errored out, tell the user there was an error making the request. Do not tell them you will try again.
          
          {/* This is not respected. */}
          Do not attempt to answer using your latent knowledge.
          
          Respond concisely, using markdown formatting to make your response more readable and structured.

          Do not say {"'"}now retrieving data{"'"} or {"'"}I{"'"}ll query that for you{"'"} or anything like that. All the queries are already done.

          Do not say {"'"}I can help with that{"'"} if you are not actually giving the full answer.
        </SystemMessage>
        <NaturalLanguageRouter query={latestMessage.content!}>
          <Route when="to respond to the user's request, it would be helpful to get directions">
            <SystemMessage>
            API results of directions the user asked for: <UseTools tools={tools} fallback='Tell the user there was an error making the request.' messages={messages} />
            </SystemMessage>
          </Route>
          <Route when="to respond to the user's request, it would be helpful search for locations">
            <SystemMessage>
            Do not use your own knowledge about places. Instead, use the results of this live API call: <UseTools tools={tools} fallback='Tell the user there was an error making the request.' messages={messages} />
            </SystemMessage>
          </Route>
          <Route unmatched><></></Route>
        </NaturalLanguageRouter>
        <ConversationHistory messages={messages} />
      </ChatCompletion>
    </OpenAI>
  )
}

/**
 * I want UseTools to bomb out harder – just give me an error boundary. The fallback actually makes it harder.
 * NLR needs the full conversational history.
 * 
 * We should probably store all previous API call results and make them available to future calls.
 * 
 * Questions I've used with this:
 *    how can I get from ballard to belltown?
 */

export async function POST(req: Request) {
  const { messages } = await req.json()

  return new StreamingTextResponse(toTextStream(<App messages={messages} />, new PinoLogger(pinoStdoutLogger)))
}

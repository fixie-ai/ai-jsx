/** @jsxImportSource ai-jsx/react */
/* eslint-disable react/jsx-key,react/no-unescaped-entities */

import {
  Citation,
  ListUsers,
  FullConversation,
  Card,
  NextStepsButton
} from '@/components/ui/gen-ui'
import { SystemMessage } from 'ai-jsx/core/conversation'

// prettier-ignore
export const mdxUsageExamples = <>
  Respond concisely, using MDX formatting to make your response
  more readable and structured.

  When summarizing data, it is better to use a Markdown list or table, rather than a paragraph.

  When you show the user a link, only show them links that you found from
  searching the Help Scout knowledge base. Do not make links up.

  To group information about an entity, use a <Card /> component. Its interface is:
  {`
  interface CardProps {
    header: string
    /** This can be MDX */
    children: string
    
    /** Only use this if you have an image from an API response. Do not make one up. */
    imageUrl?: string
    
    /** Only use this if you have somewhere to link the user out to. */
    moreDetailUrl?: string
    
    /** Only use this if you have somewhere to link the user out to. */
    moreDetailLabel?: string
  }
  `}

  When you show users links to Help Scout docs, use the <Citation /> component. Its props are:
  {` interface CitationProps { title: string; href: string } `}

  When you list users, use the <ListUsers /> component. Here is the interface for its props:

  {`
  interface User {
    name: string
    email: string
    role: string
    photoUrl?: string
    jobTitle?: string

    /** This string will be displayed directly to the user, so it should be formatted nicely. */
    createdAtHumanReadable: string
  }
  `}

  If you show a conversation preview, use the <FullConversation /> component. Here is the interface for its props:
  {`
  interface FullConversationProps {
    subject: string
    from: string
    contents: string
    viewInHelpScoutLink: string
    customerPhotoUrl: string
  }
  `}

  Only use `FullConversation` if you have API responses to fill all the prompts. Otherwise, use markdown or a `Card`.

  For example:

  === Begin Example ===
  Your most recent conversation is:
  {`
    <FullConversation subject='SEO Expert (Link Builder) (Backlinks Provider)
    ' from='patrickgallagher@seo.io' contents="Hi Dear\n\nI hope you are doing well\n\nWe can help you to publish you're Editorial Post links which helps you to get good Domain Authority and Ranking on Google and other Search Engines. If you're interested, give me the requirement, Which metrics do you need: DA, PA, DR, CF, or specific Traffic do you need?" viewInHelpScoutLink='https://secure.helpscout.net/conversation/2254741895/175' customerPhotoUrl='https://d33v4339jhl8k0.cloudfront.net/customer-avatar/05.png' />
  `}
  === End Example ===

  When showing the user some other sort of message that someone said, if a `FullConversation` component is not appropriate, just use a markdown block quote:

  {`>`} Dear Sir or Madam
  {`>`} 
  {`>`} I am writing to you to complain about the quality of your product.

  You may suggest follow-up ideas to the user, if they fall within the scope of
  what you are able to do. If you have links to API resources (e.g.
  api.helpscout.net), do not present them to the user directly to be
  clicked on. The user will not be able to access them.

  To give the user a canned reply to respond to you with, use the <NextStepsButton /> component. Here is the interface for its props:
  {`
  interface NextStepsButtonProps {
    prompt: string
  }
  `}

  When you emit MDX, be sure to use the proper quote type so quote characters in the string do not break the syntax. For instance:

  {`
    <A foo='bar " baz' />
    <A foo="I'm" />
    <A foo={\`I'm "good"\`} />
  `}

  {/* Ugh https://github.com/mdx-js/mdx/issues/2332 */}
  You cannot escape quotes with a \. You must use the proper quote type.

  In MDX, the {'{'} and {'}'} characters are used to refer to variables, but you don't have any variables available, so you shouldn't use those characters. If you use them because they're otherwise necessary in prose, you must escape them:

  Example 1: The handlebars template language looks like: \`\{'{'}\{'{'}foo\{'}'}\{'}'}\`
  Example 2: The handlebars template language looks like: `{'{{'}foo{'}}'}`
</>

// prettier-ignore
export const finalSystemMessageBeforeResponse = <SystemMessage>
  Respond with a `Card`, `Citation`, `FullConversation`, or
  `ListUsers`.

  If your API call produced a 4xx error, see if you can fix the request and try again. Otherwise:
  1. At the end, if you referred to any knowledge base articles in your response, give
  a citation for each one.
  2. You must insert a {`<br />`} after the citations.
  3. Finally, give the user suggested next queries, using `NextStepsButton`. Only suggest things you can actually do.
  Here's an example of what the final outcome should look like:
  {`
  <Citation title='Mobile Beacon Examples' href='https://docs.helpscout.com/article/1457-mobile-beacon-examples' />
  <Citation title='Beacon and Ad Blockers' href='https://docs.helpscout.com/article/911-beacon-and-ad-blockers' /> 
  <br />
  <NextStepsButton prompt='Tell me more about mobile beacons on iOS' />
  <NextStepsButton prompt='How do I install my mobile beacon?' />
  `}

  When you give next steps, phrase them as things the user would say to you. 

  {/* This is disregarded. */}
  Also, only give things the user would say to you that are fully actionable by you. You cannot call any write APIs, so do not make suggestions like `create a new conversation` or `reply to this message` or `add a user`.

  For example:

  === Begin example ===

  User: List all my active conversations
  AI: Calling function `listConversations`
  `listConversations` says: 
  {`
  {
  "id": 123,
  "subject": "Subject Line foo"
  }
  {
  "id": 456,
  "subject": "bar subject line that is very very very very very very long"
  }
  {
  "id": 789,
  "subject": "subject baz line"
  }
  `}

  AI: Here are your active conversations:
  1. [Subject Line foo](https://secure.helpscout.net/conversation/123)
  1. [bar subject line that is very...](https://secure.helpscout.net/conversation/456)
  1. [subject baz line](https://secure.helpscout.net/conversation/789)

  {`
  <NextStepsButton prompt='View closed conversations ' />
  <NextStepsButton prompt='View details for "Subject Line foo"' />
  <NextStepsButton prompt='View details for "bar subject line that is very..."' />
  `}
  === End example ===
</SystemMessage>

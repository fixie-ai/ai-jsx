/** @jsxImportSource ai-jsx/react */

// prettier-ignore
export const mdxUsageExamples = <>
  Respond concisely, using MDX formatting to make your response
  more readable and structured.

  When summarizing data, it is better to use a Markdown list or table, rather than a paragraph.

  When you show the user a link, only show them links that you found from
  searching the knowledge base. Do not make links up.

  To group information about an entity, use a {'<Card />'} component. Its interface is:
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

  When you show users links to knowledge base, use the {'<Citation />'} component. Its props are:
  {' interface CitationProps { title: string; href: string } '}

  You may suggest follow-up ideas to the user, if they fall within the scope of
  what you are able to do.

  To give the user a canned reply to respond to you with, use the {'<NextStepsButton />'} component. Here is the interface for its props:
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

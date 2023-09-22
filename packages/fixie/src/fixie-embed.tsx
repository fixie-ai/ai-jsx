import React from 'react';

export interface FixieEmbedProps extends React.IframeHTMLAttributes<HTMLIFrameElement> {
  /**
   * The agent ID you want to embed a conversation with.
   */
  agentId: string;

  /**
   * If true, the agent will speak its messages out loud.
   */
  speak?: boolean;

  /**
   * If true, the UI will show debug information, such as which functions the agent is calling.
   */
  debug?: boolean;

  /**
   * If you're not sure whether you need this, the answer is "no".
   */
  fixieHost?: string;
}

/**
 * A component to embed the Generic Fixie Chat UI on your page.
 *
 * Any extra props to this component are passed through to the `iframe`.
 */
export function FixieEmbed({ speak, debug, agentId, fixieHost, ...iframeProps }: FixieEmbedProps) {
  const embedUrl = new URL(`/embed/${agentId}`, fixieHost);
  if (speak) {
    embedUrl.searchParams.set('speak', '1');
  }
  if (debug) {
    embedUrl.searchParams.set('debug', '1');
  }

  return <iframe src={embedUrl.toString()} allow="clipboard-write" {...iframeProps}></iframe>;
}
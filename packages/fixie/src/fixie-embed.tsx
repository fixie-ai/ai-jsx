import React from 'react';

export interface FixieEmbedProps extends React.IframeHTMLAttributes<HTMLIFrameElement> {
  agentId: string;
  speak?: boolean;
  debug?: boolean;

  fixieHost?: string;
}

export function FixieEmbed({ speak, debug, agentId, fixieHost, ...iframeProps }: FixieEmbedProps) {
  const embedUrl = new URL(`/embed/${agentId}`, fixieHost);
  if (speak) {
    embedUrl.searchParams.set('speak', '1');
  }
  if (debug) {
    embedUrl.searchParams.set('debug', '1');
  }

  return <iframe className="grow" src={embedUrl.toString()} allow="clipboard-write" {...iframeProps}></iframe>;
}

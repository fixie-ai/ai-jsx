import React from 'react';

export interface FixieEmbedProps extends React.IframeHTMLAttributes<HTMLIFrameElement>{
  agentId: string;
  speak?: boolean;
  debug?: boolean;

  fixieHost?: string;
}

export function FixieEmbed({...iframeProps}: FixieEmbedProps) {
  // @ts-expect-error
  return <iframe className='grow' src={embedUrl.toString()} allow='clipboard-write' {...iframeProps}></iframe>
}
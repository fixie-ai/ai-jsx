import React from 'react';
import { createPortal } from 'react-dom';

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
   * If true, the iframe will be rendered in the DOM position where this component lives.
   *
   * If false, the iframe will be rendered floating on top of the content, with another iframe
   * to be a launcher, à la Intercom.
   */
  inline?: boolean;

  /**
   * If you're not sure whether you need this, the answer is "no".
   */
  fixieHost?: string;
}

const defaultFixieHost = 'https://fixie.vercel.app';

/**
 * A component to embed the Generic Fixie Chat UI on your page.
 *
 * Any extra props to this component are passed through to the `iframe`.
 */
export function InlineFixieEmbed({ speak, debug, agentId, fixieHost, ...iframeProps }: FixieEmbedProps) {
  return <iframe {...getBaseIframeProps({ speak, debug, agentId, fixieHost })} {...iframeProps}></iframe>;
}

export function FloatingFixieEmbed({ speak, debug, agentId, fixieHost, inline, ...iframeProps }: FixieEmbedProps) {
  const chatStyle = {
    position: 'fixed',
    bottom: `${10 + 10 + 48}px`,
    right: '10px',
    width: '400px',
    height: '90%',
    border: '1px solid #ccc',
    zIndex: '999999',
    boxShadow: '0px 5px 40px rgba(0, 0, 0, 0.16)',
    borderRadius: '16px',
  } as const;

  const launcherStyle = {
    position: 'fixed',
    bottom: '10px',
    right: '10px',
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    zIndex: '999999',
    boxShadow: '0px 5px 40px rgba(0, 0, 0, 0.16)',
    background: 'none',
  } as const;

  const launcherUrl = new URL('embed-launcher', fixieHost ?? defaultFixieHost);

  return createPortal(
    <>
      <iframe style={chatStyle} {...getBaseIframeProps({ speak, debug, agentId, fixieHost })} {...iframeProps}></iframe>

      <iframe style={launcherStyle} src={launcherUrl.toString()}></iframe>
    </>,
    document.body
  );
}

function getBaseIframeProps({
  speak,
  debug,
  fixieHost,
  agentId,
}: Pick<FixieEmbedProps, 'speak' | 'debug' | 'fixieHost' | 'agentId'>) {
  const embedUrl = new URL(`/embed/${agentId}`, fixieHost ?? defaultFixieHost);
  if (speak) {
    embedUrl.searchParams.set('speak', '1');
  }
  if (debug) {
    embedUrl.searchParams.set('debug', '1');
  }

  return {
    src: embedUrl.toString(),
    allow: 'clipboard-write',
  };
}

import React, { useEffect, useRef, useState } from 'react';
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
   * If true, the agent will send a greeting message when the conversation starts. To make this work, you'll want to
   * either specify a hardcoded greeting message as part of the agent config, or update the agent system message to
   * tell the agent how to start the conversation.
   *
   * If false, the agent will be silent until the user sends a message.
   *
   * Defaults to false.
   */
  agentSendsGreeting?: boolean;

  /**
   * Sets the title of the chat window. If you don't specify this, the agent's name will be used.
   */
  chatTitle?: string;

  /**
   * Set a primary color for the chat window. If you don't specify this, neutral colors will be used. You may wish
   * to set this to be your primary brand color.
   */
  primaryColor?: string;

  /**
   * If you're not sure whether you need this, the answer is "no".
   */
  fixieHost?: string;
}

const defaultFixieHost = 'https://embed.fixie.ai';

/**
 * A component to embed the Generic Fixie Chat UI on your page.
 *
 * Any extra props to this component are passed through to the `iframe`.
 */
export function InlineFixieEmbed({
  speak,
  debug,
  agentId,
  fixieHost,
  chatTitle,
  primaryColor,
  agentSendsGreeting,
  ...iframeProps
}: FixieEmbedProps) {
  return (
    <iframe
      {...getBaseIframeProps({ speak, debug, agentId, fixieHost, agentSendsGreeting, chatTitle, primaryColor })}
      {...iframeProps}
    ></iframe>
  );
}

export function ControlledFloatingFixieEmbed({
  visible,
  speak,
  debug,
  agentSendsGreeting,
  agentId,
  fixieHost,
  chatTitle,
  primaryColor,
  ...iframeProps
}: FixieEmbedProps & {
  /**
   * If true, the Fixie chat UI will be visible. If false, it will be hidden.
   */
  visible?: boolean;
}) {
  const chatStyle = {
    position: 'fixed',
    bottom: `${10 + 10 + 48}px`,
    right: '10px',
    width: '400px',
    height: '90%',
    border: '1px solid #ccc',
    zIndex: '999999',
    display: visible ? 'block' : 'none',
    boxShadow: '0px 5px 40px rgba(0, 0, 0, 0.16)',
    borderRadius: '16px',
    ...(iframeProps.style ?? {}),
  } as const;

  return (
    <>
      {createPortal(
        // Something rotten is happening. When I build TS from this package, it throws a dep error, which is
        // incorrect. When I build from Generic Sidekick Frontend, the types work, so having a ts-expect-error here
        // causes a problem. I don't know why GSF is trying to rebuild the TS in the first place.
        // This hacks around it.
        // eslint-disable-next-line @typescript-eslint/prefer-ts-expect-error
        // @ts-ignore
        <iframe
          {...getBaseIframeProps({ speak, debug, agentId, fixieHost, agentSendsGreeting, chatTitle, primaryColor })}
          {...iframeProps}
          style={chatStyle}
        ></iframe>,
        document.body
      )}
    </>
  );
}

export function FloatingFixieEmbed({ fixieHost, ...restProps }: FixieEmbedProps) {
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
    border: 'none',
  } as const;

  const launcherUrl = new URL('embed-launcher', fixieHost ?? defaultFixieHost);
  if (restProps.primaryColor) {
    launcherUrl.searchParams.set('primaryColor', restProps.primaryColor);
  }
  const launcherRef = useRef<HTMLIFrameElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const sidekickChannel = new MessageChannel();
    const launcherIFrame = launcherRef.current;

    if (launcherIFrame) {
      launcherIFrame.addEventListener('load', function () {
        if (launcherIFrame.contentWindow) {
          launcherIFrame.contentWindow.postMessage('channel-message-port', '*', [sidekickChannel.port2]);
        }
      });

      sidekickChannel.port1.onmessage = function (event) {
        if (event.data === 'clicked launcher') {
          setVisible((visible) => !visible);
        }
      };
    }
  }, [fixieHost]);

  return (
    <>
      {createPortal(
        // Something rotten is happening. When I build TS from this package, it throws a dep error, which is
        // incorrect. When I build from Generic Sidekick Frontend, the types work, so having a ts-expect-error here
        // causes a problem. I don't know why GSF is trying to rebuild the TS in the first place.
        // This hacks around it.
        // eslint-disable-next-line @typescript-eslint/prefer-ts-expect-error
        // @ts-ignore
        <>
          <ControlledFloatingFixieEmbed fixieHost={fixieHost} {...restProps} visible={visible} />

          <iframe style={launcherStyle} src={launcherUrl.toString()} ref={launcherRef}></iframe>
        </>,
        document.body
      )}
    </>
  );
}

export function getBaseIframeProps({
  speak,
  debug,
  agentSendsGreeting,
  fixieHost,
  agentId,
  chatTitle,
  primaryColor,
}: Pick<
  FixieEmbedProps,
  'speak' | 'debug' | 'fixieHost' | 'agentId' | 'agentSendsGreeting' | 'chatTitle' | 'primaryColor'
>) {
  const embedUrl = new URL(
    agentId.includes('/') ? `/embed/${agentId}` : `/agents/${agentId}`,
    fixieHost ?? defaultFixieHost
  );
  if (speak) {
    embedUrl.searchParams.set('speak', '1');
  }
  if (debug) {
    embedUrl.searchParams.set('debug', '1');
  }
  if (agentSendsGreeting) {
    embedUrl.searchParams.set('agentStartsConversation', '1');
  }
  if (chatTitle) {
    embedUrl.searchParams.set('chatTitle', chatTitle);
  }
  if (primaryColor) {
    embedUrl.searchParams.set('primaryColor', primaryColor);
  }

  return {
    src: embedUrl.toString(),
    allow: 'clipboard-write',
  };
}

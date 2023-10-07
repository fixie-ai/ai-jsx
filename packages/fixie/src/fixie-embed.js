import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
const defaultFixieHost = 'https://fixie.vercel.app';
/**
 * A component to embed the Generic Fixie Chat UI on your page.
 *
 * Any extra props to this component are passed through to the `iframe`.
 */
export function InlineFixieEmbed({ speak, debug, agentId, fixieHost, chatTitle, primaryColor, agentSendsGreeting, ...iframeProps }) {
    return (React.createElement("iframe", { ...getBaseIframeProps({ speak, debug, agentId, fixieHost, agentSendsGreeting, chatTitle, primaryColor }), ...iframeProps }));
}
export function ControlledFloatingFixieEmbed({ visible, speak, debug, agentSendsGreeting, agentId, fixieHost, chatTitle, primaryColor, ...iframeProps }) {
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
    };
    return (React.createElement(React.Fragment, null, createPortal(
    // Something rotten is happening. When I build TS from this package, it throws a dep error, which is
    // incorrect. When I build from Generic Sidekick Frontend, the types work, so having a ts-expect-error here
    // causes a problem. I don't know why GSF is trying to rebuild the TS in the first place.
    // This hacks around it.
    // eslint-disable-next-line @typescript-eslint/prefer-ts-expect-error
    // @ts-ignore
    React.createElement("iframe", { ...getBaseIframeProps({ speak, debug, agentId, fixieHost, agentSendsGreeting, chatTitle, primaryColor }), ...iframeProps, style: chatStyle }), document.body)));
}
export function FloatingFixieEmbed({ fixieHost, ...restProps }) {
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
    };
    const launcherUrl = new URL('embed-launcher', fixieHost ?? defaultFixieHost);
    if (restProps.primaryColor) {
        launcherUrl.searchParams.set('primaryColor', restProps.primaryColor);
    }
    const launcherRef = useRef(null);
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
    return (React.createElement(React.Fragment, null, createPortal(
    // Something rotten is happening. When I build TS from this package, it throws a dep error, which is
    // incorrect. When I build from Generic Sidekick Frontend, the types work, so having a ts-expect-error here
    // causes a problem. I don't know why GSF is trying to rebuild the TS in the first place.
    // This hacks around it.
    // eslint-disable-next-line @typescript-eslint/prefer-ts-expect-error
    // @ts-ignore
    React.createElement(React.Fragment, null,
        React.createElement(ControlledFloatingFixieEmbed, { fixieHost: fixieHost, ...restProps, visible: visible }),
        React.createElement("iframe", { style: launcherStyle, src: launcherUrl.toString(), ref: launcherRef })), document.body)));
}
function getBaseIframeProps({ speak, debug, agentSendsGreeting, fixieHost, agentId, chatTitle, primaryColor, }) {
    const embedUrl = new URL(`/embed/${agentId}`, fixieHost ?? defaultFixieHost);
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

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
/**
 * A component to embed the Generic Fixie Chat UI on your page.
 *
 * Any extra props to this component are passed through to the `iframe`.
 */
export declare function InlineFixieEmbed({ speak, debug, agentId, fixieHost, chatTitle, primaryColor, agentSendsGreeting, ...iframeProps }: FixieEmbedProps): React.JSX.Element;
export declare function ControlledFloatingFixieEmbed({ visible, speak, debug, agentSendsGreeting, agentId, fixieHost, chatTitle, primaryColor, ...iframeProps }: FixieEmbedProps & {
    /**
     * If true, the Fixie chat UI will be visible. If false, it will be hidden.
     */
    visible?: boolean;
}): React.JSX.Element;
export declare function FloatingFixieEmbed({ fixieHost, ...restProps }: FixieEmbedProps): React.JSX.Element;

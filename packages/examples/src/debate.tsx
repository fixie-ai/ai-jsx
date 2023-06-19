import _ from 'lodash';
import { showInspector } from 'ai-jsx/core/inspector';
import { AssistantMessage, ChatCompletion, SystemMessage, UserMessage } from 'ai-jsx/core/completion';
import * as AI from 'ai-jsx';
import { Inline } from 'ai-jsx/core/inline';

async function ConversationRemapper(
  props: {
    system?: AI.ElementPredicate;
    users?: Record<string, AI.ElementPredicate> | AI.ElementPredicate;
    assistant?: AI.ElementPredicate;
    children: AI.Node;
  },
  { render }: AI.ComponentContext
) {
  const system = props.system ?? (() => false);
  const users = props.users ?? (() => false);
  const assistant = props.assistant ?? (() => false);

  const allPredicates: AI.ElementPredicate[] = [
    system,
    ...(typeof users === 'function' ? [users] : Object.values(users)),
    assistant,
    (node) => node.tag == SystemMessage || node.tag == UserMessage || node.tag == AssistantMessage,
  ];
  const partiallyRendered = await render(props.children, {
    stop: (e) => Boolean(allPredicates.find((pred) => pred(e))),
  });

  return partiallyRendered.filter(AI.isElement).map((node) => {
    if (system(node)) {
      return <SystemMessage>{node}</SystemMessage>;
    }

    if (typeof users === 'function') {
      if (users(node)) {
        return <UserMessage>{node}</UserMessage>;
      }
    } else {
      for (const [name, selector] of Object.entries(users)) {
        if (selector(node)) {
          return <UserMessage name={name}>{node}</UserMessage>;
        }
      }
    }

    if (assistant(node)) {
      return <AssistantMessage>{node}</AssistantMessage>;
    }

    return node;
  });
}

function Debater(props: { position: string; name: string; inFavor: boolean; children: AI.Node }) {
  return (
    <UserMessage name={props.name}>
      <ChatCompletion temperature={0.1}>
        <ConversationRemapper
          assistant={(node) =>
            node.tag === UserMessage && (node.props as AI.PropsOfComponent<typeof UserMessage>).name === props.name
          }
        >
          <SystemMessage>
            You are a debate assistant tasked with writing responses for {props.name} who is arguing{' '}
            {props.inFavor ? 'in favor of' : 'against'} the following position: {props.position}
          </SystemMessage>
          {props.children}
        </ConversationRemapper>
      </ChatCompletion>
    </UserMessage>
  );
}

function DebateDemo(props: { position: string; rounds: number }) {
  function Moderator({ children }: { children: AI.Node }) {
    return (
      <>
        Moderator: <UserMessage name="Moderator">{children}</UserMessage>
        {'\n\n'}
      </>
    );
  }

  function Alice({ children }: { children: AI.Node }) {
    return (
      <>
        {Alice.name}:{' '}
        <Debater name={Alice.name} inFavor position={props.position}>
          {children}
        </Debater>
        {'\n\n'}
      </>
    );
  }

  function Bob({ children }: { children: AI.Node }) {
    return (
      <>
        {Bob.name}:{' '}
        <Debater name={Bob.name} inFavor={false} position={props.position}>
          {children}
        </Debater>
        {'\n\n'}
      </>
    );
  }

  return (
    <Inline>
      <Moderator>
        All statements and responses must be no more than four sentences. You will each provide opening statements,
        followed by {props.rounds.toString()} round(s) of arguments, followed by closing statements.
      </Moderator>
      {(conversation) => (
        // Opening statements are made in parallel.
        <>
          <Inline>
            <Moderator>Alice, please make your opening statement.</Moderator>
            {(directive) => (
              <Alice>
                {conversation}
                {directive}
              </Alice>
            )}
          </Inline>
          <Inline>
            <Moderator>Bob, please make your opening statement.</Moderator>
            {(directive) => (
              <Bob>
                {conversation}
                {directive}
              </Bob>
            )}
          </Inline>
        </>
      )}
      {_.times(props.rounds, () => [
        <Moderator>Alice, please respond to Bob.</Moderator>,
        (conversation: AI.Node) => <Alice>{conversation}</Alice>,
        <Moderator>Bob, please respond to Alice.</Moderator>,
        (conversation: AI.Node) => <Bob>{conversation}</Bob>,
      ])}
      {(conversation) => (
        // Closing statements are made in parallel.
        <>
          <Inline>
            <Moderator>Alice, please make your closing statement.</Moderator>
            {(directive) => (
              <Alice>
                {conversation}
                {directive}
              </Alice>
            )}
          </Inline>
          <Inline>
            <Moderator>Bob, please make your closing statement.</Moderator>
            {(directive) => (
              <Bob>
                {conversation}
                {directive}
              </Bob>
            )}
          </Inline>
        </>
      )}
    </Inline>
  );
}

showInspector(
  <DebateDemo position="React supplanted Angular because its templating language was superior." rounds={1} />,
  { showDebugTree: false }
);

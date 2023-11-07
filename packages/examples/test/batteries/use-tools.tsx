import * as AI from 'ai-jsx';
import { UseTools } from 'ai-jsx/batteries/use-tools';
import { ChatProvider } from 'ai-jsx/core/completion';
import {
  AssistantMessage,
  FunctionCall,
  ShowConversation,
  UserMessage,
  renderToConversation,
} from 'ai-jsx/core/conversation';

async function FakeChatCompletion({ children }: { children: AI.Node }, { render }: AI.ComponentContext) {
  const nodes = await renderToConversation(children, render);
  if (nodes.find((n) => n.type === 'functionCall')) {
    return <AssistantMessage>DONE</AssistantMessage>;
  }
  return <FunctionCall id="$myFunc" name="myFunc" args={{ parameter: 'test parameter value' }} />;
}

it('should call a tool', async () => {
  const renderCtx = AI.createRenderContext();
  const result = await renderCtx.render(
    <ShowConversation
      present={(m) => (
        <>
          {m.type}: {m.element}
          {'\n'}
        </>
      )}
    >
      <ChatProvider component={FakeChatCompletion}>
        <UseTools
          showSteps
          tools={{
            myFunc: {
              description: 'Test tool',
              parameters: {
                parameter: {
                  description: 'Test parameter',
                  type: 'string',
                  required: true,
                },
              },
              func: ({ parameter }: { parameter: string }) => parameter.toLocaleUpperCase(),
            },
          }}
        >
          <UserMessage>Hello!</UserMessage>
        </UseTools>
      </ChatProvider>
    </ShowConversation>
  );

  expect(result).toMatchInlineSnapshot(`
    "functionCall: Call function myFunc (id $myFunc) with {"parameter":"test parameter value"}
    functionResponse: function myFunc (id $myFunc) returned TEST PARAMETER VALUE
    assistant: DONE
    "
  `);
});

it('should give tools access to context', async () => {
  const myContext = AI.createContext(0);

  function MyTool({ parameter }: { parameter: string }, { getContext }: AI.ComponentContext) {
    return (
      <>
        {parameter}: {getContext(myContext)}
      </>
    );
  }

  const renderCtx = AI.createRenderContext();
  const result = await renderCtx.render(
    <ShowConversation
      present={(m) => (
        <>
          {m.type}: {m.element}
          {'\n'}
        </>
      )}
    >
      <myContext.Provider value={42}>
        <ChatProvider component={FakeChatCompletion}>
          <UseTools
            showSteps
            tools={{
              myFunc: {
                description: 'Test tool',
                parameters: {
                  parameter: {
                    description: 'Test parameter',
                    type: 'string',
                    required: true,
                  },
                },
                func: MyTool,
              },
            }}
          >
            <UserMessage>Hello!</UserMessage>
          </UseTools>
        </ChatProvider>
      </myContext.Provider>
    </ShowConversation>
  );

  expect(result).toMatchInlineSnapshot(`
    "functionCall: Call function myFunc (id $myFunc) with {"parameter":"test parameter value"}
    functionResponse: function myFunc (id $myFunc) returned test parameter value: 42
    assistant: DONE
    "
  `);
});

it('should handle failures', async () => {
  const myContext = AI.createContext(0);

  function MyTool(_: { parameter: string }): AI.Node {
    throw new Error('ERROR!');
  }

  const renderCtx = AI.createRenderContext();
  const result = await renderCtx.render(
    <ShowConversation
      present={(m) => (
        <>
          {m.type}: {m.element}
          {'\n'}
        </>
      )}
    >
      <myContext.Provider value={42}>
        <ChatProvider component={FakeChatCompletion}>
          <UseTools
            showSteps
            tools={{
              myFunc: {
                description: 'Test tool',
                parameters: {
                  parameter: {
                    description: 'Test parameter',
                    type: 'string',
                    required: true,
                  },
                },
                func: MyTool,
              },
            }}
          >
            <UserMessage>Hello!</UserMessage>
          </UseTools>
        </ChatProvider>
      </myContext.Provider>
    </ShowConversation>
  );

  expect(result).toMatchInlineSnapshot(`
    "functionCall: Call function myFunc (id $myFunc) with {"parameter":"test parameter value"}
    functionResponse: function myFunc (id $myFunc) failed with Error: ERROR!
    assistant: DONE
    "
  `);
});

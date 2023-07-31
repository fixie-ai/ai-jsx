import { ChatCompletion, SystemMessage, UserMessage } from 'ai-jsx/core/completion';
// import { showInspector } from 'ai-jsx/core/inspector';
import * as AI from 'ai-jsx';
import ReadableWebStreamToNodeStream from 'readable-web-to-node-stream';

function App() {
  return (
    <ChatCompletion>
      <SystemMessage>You are an assistant who only uses one syllable words.</SystemMessage>
      <UserMessage>Why is the sky blue?</UserMessage>
    </ChatCompletion>
  );
}

// showInspector(<App />);

/* eslint-disable no-undef */

// function sleep() {
//   return new Promise(resolve => setTimeout(resolve, 500));
// }
// console.log('pre sleep')
// await sleep();
// console.log('post sleep')

function render(renderable: any, opts?: Pick<AI.RenderOpts, 'map'>) {
  const mapFn = opts?.map ? opts.map : (x: string) => x;

  function makeRenderAdapter(renderResult: AI.RenderResult<string, string>) {
    let lastFrame = mapFn('');
    let done = false;
    let resolveNextFrameAvailable: (value?: unknown) => void;
    let nextFrameAvailable = new Promise((resolve) => {
      resolveNextFrameAvailable = resolve;
    });

    let resolveFinalResult;
    let finalResult = new Promise((resolve) => {
      resolveFinalResult = resolve;
    });

    (async () => {
      let loopIteration = 0;
      for await (const frame of renderResult) {
        // console.log({frame, loopIteration: loopIteration++});
        lastFrame = mapFn(frame);
        resolveNextFrameAvailable!();

        nextFrameAvailable = new Promise((resolve) => {
          resolveNextFrameAvailable = resolve;
        });
      }
      done = true;
      resolveFinalResult!(lastFrame);
    })();

    return {
      getLastFrame: () => lastFrame,
      getDone: () => done,
      getResolveNextFrameAvailable: () => resolveNextFrameAvailable,
      finalResult,
    };
  }

  const renderContext = AI.createRenderContext(/* take logger */);
  const memoized = renderContext.memo(renderable);
  const treeStreamRender = AI.createRenderContext().render(memoized);
  const appendStreamRender = AI.createRenderContext().render(memoized, { appendOnly: true });

  const treeStreamRenderAdapter = makeRenderAdapter(treeStreamRender);
  const appendStreamRenderAdapter = makeRenderAdapter(appendStreamRender);

  function makeFrameStream(renderAdapter: ReturnType<typeof makeRenderAdapter>) {
    // let lastEmitted: string | undefined;
    return new ReadableStream({
      async pull(controller) {
        // console.log('pull', lastEmitted, lastFrame)

        // When I do this, the process exits with code 13
        // if (lastEmitted !== lastFrame) {
        //   controller.enqueue(lastFrame);
        //   lastEmitted = lastFrame;
        // }

        // If I do this, we see a bunch of intermediate frames.
        controller.enqueue(renderAdapter.getLastFrame());

        if (renderAdapter.getDone()) {
          controller.close();
        }
        await renderAdapter.getResolveNextFrameAvailable();
      },
    });
  }

  function makeDeltaTransformer() {
    let lastEmittedValue = '';
    return new TransformStream({
      transform(latestFrame, controller) {
        const delta = latestFrame.slice(lastEmittedValue.length);
        lastEmittedValue = latestFrame;
        controller.enqueue(delta);
      },
    });
  }

  function makeDeltaStream() {
    return makeFrameStream(appendStreamRenderAdapter).pipeThrough(makeDeltaTransformer());
  }

  return {
    treeStream: () => makeFrameStream(treeStreamRenderAdapter),
    appendStream: () => makeFrameStream(appendStreamRenderAdapter),
    deltaStream: makeDeltaStream,
    // We could pull the final result from either adapter – they're equivalent.
    result: appendStreamRenderAdapter.finalResult,

    writeToStdout: () =>
      // @ts-expect-error
      new ReadableWebStreamToNodeStream.ReadableWebToNodeStream(makeDeltaStream()).pipe(process.stdout),
  };
}

/**
 * Helper function for debugging.
 */
async function streamToValues(stream: ReadableStream) {
  const values: any[] = [];

  await stream.pipeTo(
    new WritableStream({
      write(chunk) {
        values.push(chunk);
      },
    })
  );

  return values;
}

// This all needs to be validated with genuine async.

const renderable = <App />;
const rendered = render(renderable);
console.log('=== First Render ===');
// You can consume a stream multiple times.
console.log(
  await Promise.all([
    streamToValues(rendered.treeStream()),
    streamToValues(rendered.treeStream()),
    streamToValues(rendered.deltaStream()),
  ])
);
// If you consume a stream after the render is complete, you just get one chunk with the final result.
console.log(await streamToValues(rendered.treeStream()));
console.log('Deltas', await streamToValues(rendered.deltaStream()));
console.log('Final result:', await rendered.result);

console.log();
console.log('=== Second Render ===');
// Pass a single map function, and it's applied to intermediate and the final results.
const mappedRender = render(renderable, {
  map: (frame) => `frame prefix: ${frame}`,
});
console.log('Tree stream', await streamToValues(mappedRender.treeStream()));
console.log('Append stream', await streamToValues(mappedRender.appendStream()));
console.log('Deltas', await streamToValues(mappedRender.deltaStream()));
console.log('Final result:', await mappedRender.result);

console.log();
console.log('=== Third Render ===');
const renderForAppendStream = render(renderable);
console.log(await streamToValues(renderForAppendStream.treeStream()));
console.log(await streamToValues(renderForAppendStream.appendStream()));

console.log();
console.log('=== Fourth Render: writing to stdout ===');
await render(renderable).writeToStdout();
console.log('\nDone writing to stdout');

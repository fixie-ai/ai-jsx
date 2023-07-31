import { ChatCompletion, SystemMessage, UserMessage } from 'ai-jsx/core/completion';
// import { showInspector } from 'ai-jsx/core/inspector';
import * as AI from 'ai-jsx';
import ReadableWebStreamToNodeStream from 'readable-web-to-node-stream';
import { EventEmitter } from 'node:events';

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
    // let resolveNextFrameAvailable: (value?: unknown) => void;
    // let nextFrameAvailable = new Promise((resolve) => {
    //   resolveNextFrameAvailable = resolve;
    // });

    let resolveFinalResult;
    let finalResult = new Promise((resolve) => {
      resolveFinalResult = resolve;
    });

    const eventEmitter = new EventEmitter();

    (async () => {
      let loopIteration = 0;
      for await (const frame of renderResult) {
        console.log({ frame, loopIteration: loopIteration++ });
        lastFrame = mapFn(frame);
        eventEmitter.emit('frame', lastFrame);
        // resolveNextFrameAvailable!();

        // nextFrameAvailable = new Promise((resolve) => {
        //   resolveNextFrameAvailable = resolve;
        // });
        // console.log('await next frame');
      }
      done = true;
      resolveFinalResult!(lastFrame);
    })();

    // Function to create a new ReadableStream for each consumer
    function createFrameStream() {
      const streamController = new TransformStream();
      const writer = streamController.writable.getWriter();
      writer.write(lastFrame);
      eventEmitter.on('frame', (frame) => {
        writer.write(frame);
      });

      // Close the stream when done
      if (done) {
        writer.close();
      } else {
        finalResult.then(() => {
          writer.write(lastFrame);
          writer.close();
        });
      }

      return streamController.readable;
    }

    function createDeltaStream() {
      let lastEmittedValue = '';
      const transformStream = new TransformStream({
        transform(latestFrame, controller) {
          const delta = latestFrame.slice(lastEmittedValue.length);
          lastEmittedValue = latestFrame;
          controller.enqueue(delta);
        },
      });
      return createFrameStream().pipeThrough(transformStream);
    }

    return {
      createFrameStream,
      createDeltaStream,

      // getLastFrame: () => lastFrame,
      // getDone: () => done,
      // getResolveNextFrameAvailable: () => resolveNextFrameAvailable,
      finalResult,
    };
  }

  const renderContext = AI.createRenderContext(/* take logger */);
  const memoized = renderContext.memo(renderable);
  const treeStreamRender = renderContext.render(memoized);
  const appendStreamRender = renderContext.render(memoized, { appendOnly: true });
  const treeStreamRenderAdapter = makeRenderAdapter(treeStreamRender);

  // treeStreamRenderAdapter.finalResult.then(out => console.log('out result', out))

  const appendStreamRenderAdapter = makeRenderAdapter(appendStreamRender);

  return {
    treeStream: treeStreamRenderAdapter.createFrameStream,
    appendStream: appendStreamRenderAdapter.createFrameStream,
    deltaStream: treeStreamRenderAdapter.createDeltaStream,
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
// // If you consume a stream after the render is complete, you just get one chunk with the final result.
// console.log(await streamToValues(rendered.treeStream()));
// // console.log('Deltas', await streamToValues(rendered.deltaStream()));
// // console.log('Final result:', await rendered.result);

// console.log();
// console.log('=== Second Render ===');
// // Pass a single map function, and it's applied to intermediate and the final results.
// const mappedRender = render(renderable, {
//   map: (frame) => `frame prefix: ${frame}`,
// });
// console.log('Tree stream', await streamToValues(mappedRender.treeStream()));
// // console.log('Append stream', await streamToValues(mappedRender.appendStream()));
// // console.log('Deltas', await streamToValues(mappedRender.deltaStream()));
// // console.log('Final result:', await mappedRender.result);

// console.log();
// console.log('=== Third Render ===');
// const renderForAppendStream = render(renderable);
// console.log(await streamToValues(renderForAppendStream.treeStream()));
// // console.log(await streamToValues(renderForAppendStream.appendStream()));

// console.log();
// console.log('=== Fourth Render: writing to stdout ===');
// await render(renderable).writeToStdout();
// console.log('\nDone writing to stdout');

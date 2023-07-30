import { ChatCompletion, SystemMessage, UserMessage } from 'ai-jsx/core/completion';
// import { showInspector } from 'ai-jsx/core/inspector';
import * as AI from 'ai-jsx';

function App() {
  return (
    <ChatCompletion>
      <SystemMessage>You are an assistant who only uses one syllable words.</SystemMessage>
      <UserMessage>Why is the sky blue?</UserMessage>
    </ChatCompletion>
  );
}

// showInspector(<App />);

async function* renderableMock() {
  yield 'first '
  yield 'first second '
  yield 'first second third'
}

// class RenderObserver {
//   constructor()  
// }

/* eslint-disable no-undef */

function render(renderable: any, opts?: Pick<AI.RenderOpts, 'map'>) {
  const mapFn = opts?.map ? opts.map : (x: string) => x;
  
  function makeRenderAdapter(renderResult: AI.RenderResult<string, string>) {
    let lastFrame = mapFn('');
    let done = false;
    let resolveNextFrameAvailable: (value?: unknown) => void;
    let nextFrameAvailable = new Promise(resolve => {
      resolveNextFrameAvailable = resolve;
    });
  
    let resolveFinalResult;
    let finalResult = new Promise(resolve => {
      resolveFinalResult = resolve
    });

    (async () => {
      for await (const frame of renderResult) {
        lastFrame = mapFn(frame);
        resolveNextFrameAvailable!();
  
        nextFrameAvailable = new Promise(resolve => {
          resolveNextFrameAvailable = resolve;
        })
      }
      done = true;
      resolveFinalResult!(lastFrame);
    })() 

    return {
      getLastFrame: () => lastFrame,
      getDone: () => done,
      getResolveNextFrameAvailable: () => resolveNextFrameAvailable,
      finalResult
    }
  }


  const renderContext = AI.createRenderContext(/* take logger */); 
  const memoized = renderContext.memo(renderable);
  const treeStreamRender = AI.createRenderContext().render(memoized);
  const appendStreamRender = AI.createRenderContext().render(memoized, {appendOnly: true});

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
      }
    })
  }

  /**
   * This only works when the stream being piped into it is appendOnly.
   * Can I memoize a renderable and then render it both appendOnly
   * and tree-streamed?
   */
  function makeDeltaStream() {
    let lastEmittedValue = '';
    return new TransformStream({
      transform(latestFrame, controller) {
        const delta = latestFrame.slice(lastEmittedValue.length)
        lastEmittedValue = latestFrame;
        controller.enqueue(delta);
      }
    })  
  }

  return {
    treeStream: () => makeFrameStream(treeStreamRenderAdapter),
    appendStream: () => makeFrameStream(appendStreamRenderAdapter),
    deltaStream: () => makeFrameStream(appendStreamRenderAdapter).pipeThrough(makeDeltaStream()),
    // We could pull the final result from either adapter – they're equivalent.
    result: appendStreamRenderAdapter.finalResult
  }
}

async function streamToValues(stream: ReadableStream) {
  const values: any[] = [];
  
  await stream.pipeTo(new WritableStream({
    write(chunk) {
      values.push(chunk);
    }
  }))

  return values;
}

const renderable = <App />
const rendered = render(renderable);
console.log('=== First Render ===')
// You can consume a stream multiple times.
console.log(await Promise.all([
  // streamToValues(rendered.treeStream()),
  // streamToValues(rendered.treeStream()),
  streamToValues(rendered.deltaStream()),
]))
// If you consume a stream after the render is complete, you just get one chunk with the final result.
// console.log(await streamToValues(rendered.treeStream()))
// console.log('Deltas', await streamToValues(rendered.deltaStream()))
// console.log('Final result:', await rendered.result)

// console.log();
// console.log('=== Second Render ===')
// // Pass a single map function, and it's applied to intermediate and the final results.
// const mappedRender = render(renderable, {
//   map: frame => `frame prefix: ${frame}`
// })
// console.log(await streamToValues(mappedRender.treeStream()))
// console.log('Deltas', await streamToValues(mappedRender.deltaStream()))
// console.log('Final result:', await mappedRender.result)

// // const reader = render(renderableMock).frameStream.getReader()
// // while (true) {
// //   const { done, value } = await reader.read();
// //   if (done) {
// //     break;
// //   }
// //   process.stdout.write(value);
// // }
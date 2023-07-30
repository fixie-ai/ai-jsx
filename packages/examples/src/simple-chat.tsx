// import { ChatCompletion, SystemMessage, UserMessage } from 'ai-jsx/core/completion';
// import { showInspector } from 'ai-jsx/core/inspector';
import * as AI from 'ai-jsx';

// function App() {
//   return (
//     <ChatCompletion>
//       <SystemMessage>You are an assistant who only uses one syllable words.</SystemMessage>
//       <UserMessage>Why is the sky blue?</UserMessage>
//     </ChatCompletion>
//   );
// }

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

  let lastFrame = mapFn('');
  let done = false;
  let resolveNextFrameAvailable;
  let nextFrameAvailable = new Promise(resolve => {
    resolveNextFrameAvailable = resolve;
  });

  let resolveFinalResult;
  let finalResult = new Promise(resolve => {
    resolveFinalResult = resolve
  });

  
  (async () => {
    for await (const frame of renderable()) {
      lastFrame = mapFn(frame);
      resolveNextFrameAvailable!();

      nextFrameAvailable = new Promise(resolve => {
        resolveNextFrameAvailable = resolve;
      })
    }
    done = true;
    resolveFinalResult!(lastFrame);
  })()

  function makeFrameStream() {
    return new ReadableStream({
      async pull(controller) {
        controller.enqueue(lastFrame);
        if (done) {
          controller.close();
        }
        await resolveNextFrameAvailable!;
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
        const delta = latestFrame.slice(lastEmittedValue)
        lastEmittedValue = latestFrame;
        controller.enqueue(delta);
      }
    })  
  }

  // Maybe there should be an export on this object called treeStream.

  return {
    frameStream: makeFrameStream,
    deltaStream: () => makeFrameStream().pipeThrough(makeDeltaStream()),
    result: finalResult
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

const rendered = render(renderableMock);
// You can consume a stream multiple times.
console.log(await Promise.all([
  streamToValues(rendered.frameStream()),
  streamToValues(rendered.frameStream())
]))
// If you consume a stream after the render is complete, you just get one chunk with the final result.
console.log(await streamToValues(rendered.frameStream()))
// You can await the final result as a promise.
console.log(await rendered.result)

// Pass a single map function, and it's applied to intermediate and the final results.
const mappedRender = render(renderableMock, {
  map: frame => `frame prefix: ${frame}`
})
console.log(await streamToValues(mappedRender.frameStream()))
console.log(await mappedRender.result)

// const reader = render(renderableMock).frameStream.getReader()
// while (true) {
//   const { done, value } = await reader.read();
//   if (done) {
//     break;
//   }
//   process.stdout.write(value);
// }
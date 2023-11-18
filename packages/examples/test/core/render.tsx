import * as AI from 'ai-jsx';

it('ensures that synchronous updates are not batched when batchFrames is false', async () => {
  async function* MyComponent() {
    yield '1';
    yield '2';
    return '3';
  }

  const ctx = AI.createRenderContext();
  const renderResult = ctx.render(<MyComponent />, { batchFrames: false });
  const frames: string[] = [];
  for await (const frame of renderResult) {
    frames.push(frame);
  }
  expect(frames).toEqual(['1', '2']);
  expect(await renderResult).toBe('3');
});

it('ensures that synchronous updates are batched when batchFrames is true', async () => {
  async function* MyComponent() {
    yield '1';
    yield '2';
    return '3';
  }

  const ctx = AI.createRenderContext();
  const renderResult = ctx.render(<MyComponent />, { batchFrames: true });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  for await (const _ of renderResult) {
    throw new Error('Render updates should be batched');
  }
  expect(await renderResult).toBe('3');
});

import * as AI from 'ai-jsx';

it('ensures that elements are only rendered once', async () => {
  let didRender = false;
  function Component() {
    if (didRender) {
      return 'FAIL';
    }

    didRender = true;
    return 'PASS';
  }

  const ctx = AI.createRenderContext();
  const element = ctx.memo(<Component />);
  expect(await ctx.render(element)).toBe('PASS');
  expect(await ctx.render(element)).toBe('PASS');
});

it('works with nested components', async () => {
  let didRender = false;
  function Component() {
    if (didRender) {
      return 'FAIL';
    }

    didRender = true;
    return 'PASS';
  }

  function Parent() {
    return (
      <>
        <Component />
      </>
    );
  }

  const ctx = AI.createRenderContext();
  const element = ctx.memo(<Parent />);
  expect(await ctx.render(element)).toBe('PASS');
  expect(await ctx.render(element)).toBe('PASS');
});

it('works with nested/async components', async () => {
  let didRender = false;
  function Component() {
    if (didRender) {
      return 'FAIL';
    }

    didRender = true;
    return 'PASS';
  }

  function AsyncParent() {
    return Promise.resolve(
      <>
        <Component />
      </>
    );
  }

  const ctx = AI.createRenderContext();
  const element = ctx.memo(<AsyncParent />);
  expect(await ctx.render(element)).toBe('PASS');
  expect(await ctx.render(element)).toBe('PASS');
});

it('works for streams', async () => {
  async function* Component() {
    yield 3;
    yield 2;
    yield 1;
    return 'LIFTOFF';
  }

  const ctx = AI.createRenderContext();
  const element = ctx.memo(<Component />);

  const frames = [] as string[];
  const renderResult = ctx.render(element);
  for await (const frame of renderResult) {
    frames.push(frame);
  }
  expect(frames).toEqual(['3', '2', '1']);
  expect(await renderResult).toBe('LIFTOFF');
  expect(await ctx.render(element)).toBe('LIFTOFF');
});

it('works for append-only streams', async () => {
  async function* Component() {
    yield AI.AppendOnlyStream;
    yield 3;
    yield 2;
    yield 1;
    return 'LIFTOFF';
  }

  const ctx = AI.createRenderContext();
  const element = ctx.memo(<Component />);

  const frames = [] as string[];
  const renderResult = ctx.render(element);
  for await (const frame of renderResult) {
    frames.push(frame);
  }
  expect(frames).toEqual(['', '3', '32', '321']);
  expect(await renderResult).toEqual('321LIFTOFF');
  expect(await ctx.render(element)).toBe('321LIFTOFF');
});

it('works for streams that become append-only', async () => {
  async function* Component() {
    yield 4;
    yield 3;
    yield AI.AppendOnlyStream;
    yield 2;
    yield 1;
    return 'LIFTOFF';
  }

  const ctx = AI.createRenderContext();
  const element = ctx.memo(<Component />);

  const frames = [] as string[];
  const renderResult = ctx.render(element);
  for await (const frame of renderResult) {
    frames.push(frame);
  }
  expect(frames).toEqual(['4', '3', '3', '32', '321']);
  expect(await renderResult).toEqual('321LIFTOFF');
  expect(await ctx.render(element)).toBe('321LIFTOFF');
});

it('works for streams that become append-only using a value', async () => {
  async function* Component() {
    yield 4;
    yield 3;
    yield AI.AppendOnlyStream(2);
    yield 1;
    return 'LIFTOFF';
  }

  const ctx = AI.createRenderContext();
  const element = ctx.memo(<Component />);

  const frames = [] as string[];
  const renderResult = ctx.render(element);
  for await (const frame of renderResult) {
    frames.push(frame);
  }
  expect(frames).toEqual(['4', '3', '32', '321']);
  expect(await renderResult).toEqual('321LIFTOFF');
  expect(await ctx.render(element)).toBe('321LIFTOFF');
});

it('coalesces frames when there are multiple concurrent renders', async () => {
  async function* Component() {
    yield 5;
    yield 4;
    yield AI.AppendOnlyStream;
    yield 3;
    yield 2;
    yield 1;
    return 'LIFTOFF';
  }

  const ctx = AI.createRenderContext();
  const element = ctx.memo(<Component />);

  const iterator1 = ctx.render(element)[Symbol.asyncIterator]();
  const iterator2 = ctx.render(element)[Symbol.asyncIterator]();

  expect((await iterator1.next()).value).toBe('5');
  expect((await iterator2.next()).value).toBe('5');

  expect((await iterator1.next()).value).toBe('4');
  expect((await iterator1.next()).value).toBe('4');
  expect((await iterator1.next()).value).toBe('43');

  expect((await iterator2.next()).value).toBe('4');

  expect((await iterator1.next()).value).toBe('432');
  expect((await iterator1.next()).value).toBe('4321');
  expect((await iterator2.next()).value).toBe('4321');

  expect(await iterator1.next()).toEqual({ value: '4321LIFTOFF', done: true });
  expect(await iterator2.next()).toEqual({ value: '4321LIFTOFF', done: true });

  const iterator3 = ctx.render(element)[Symbol.asyncIterator]();
  expect(await iterator3.next()).toEqual({ value: '4321LIFTOFF', done: true });
});

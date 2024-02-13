import * as AI from 'ai-jsx';

it('works for simple strings without awaiting', () => {
  const ctx = AI.createRenderContext();
  expect(ctx.render('Hello, world!').toString()).toBe('Hello, world!');
});

it('works for promised strings', async () => {
  const ctx = AI.createRenderContext();
  expect(await ctx.render(Promise.resolve('Hello, world!')).toStringAsync()).toBe('Hello, world!');
});

it('works for simple JSX without awaiting', () => {
  const ctx = AI.createRenderContext();
  expect(
    ctx
      .render(
        <b>
          Hello, <i>world!</i>
        </b>
      )
      .toString()
  ).toBe('Hello, world!');
});

it('works for async generators', async () => {
  async function* gen() {
    yield 'Hello, ';
    await Promise.resolve();
    yield 'world!';
  }

  const ctx = AI.createRenderContext();
  expect(await ctx.render(gen()).toStringAsync()).toBe('Hello, world!');
});

it('works for async generators with JSX', async () => {
  async function* gen() {
    yield 'Hello, ';
    await Promise.resolve();
    yield <b>world!</b>;
  }

  const ctx = AI.createRenderContext();
  expect(await ctx.render(<>{gen()}</>).toStringAsync()).toBe('Hello, world!');
});

describe('replacement', () => {
  const ctx = AI.createRenderContext();
  const renderElement = ctx.render(
    <b>
      Hello, <i>world!</i>
    </b>
  );

  it('works for synchronous replacements', () => {
    const replacement = ctx.render(<u>goodbye!</u>);
    const replaced = AI.replace(renderElement, (e) => (typeof e === 'object' && e.type === 'i' ? replacement : e));
    expect(replaced.toString()).toBe('Hello, goodbye!');
  });

  it('works for asynchronous replacements', async () => {
    const replacement = ctx.render(Promise.resolve(<u>goodbye!</u>));
    const replaced = AI.replace(renderElement, (e) => (typeof e === 'object' && e.type === 'i' ? replacement : e));
    expect(await replaced.toStringAsync()).toBe('Hello, goodbye!');
  });
});

describe('subtree replacement', () => {
  const ctx = AI.createRenderContext();
  const renderElement = ctx.render(
    <b>
      Hello,{' '}
      <i>
        <u>world</u>!
      </i>
    </b>
  );

  const replacement = ctx.render(<u>goodbye!</u>);

  it('works for synchronous replacements', async () => {
    for await (const [node, path] of AI.traverse(renderElement, {
      yield: (node): node is AI.RenderedIntrinsicElement<'u'> => node.type === 'u',
    })) {
      const replaced = AI.replaceSubtree(renderElement, path, (e) => (e === node ? replacement : e));
      expect(await replaced.toStringAsync()).toBe('Hello, goodbye!');
    }
  });
});

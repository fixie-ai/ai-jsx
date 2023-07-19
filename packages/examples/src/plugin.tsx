import { compile } from '@mdx-js/mdx';
import { Jsonifiable } from 'type-fest';
import _ from 'lodash';

interface Node {
  type: string;
  tagName?: string;
  children?: Node[];
  name?: string;
  value?: string;
  attributes?: { type: string; name: string; value: string }[];
}

let ast: Node | undefined;

function rehypePlugin() {
  return (_ast: Node) => {
    ast = _ast;
  };
}

const fullMarkdown = `
import YouTube from "./YouTube";

# Welcome

<YouTube id="123" />

<A d='asdf'><B c /></A>
`;

/**
 * The input `<A><B c ` will emit the compiler error:
 *    Expected a closing tag for `</B>`
 *
 * Clearly this is a bug.
 */

const partialMarkdown = `this is valid <A><B c /></A>`;

function remarkPlugin() {
  return (tree: any) => {
    // console.log('tree', JSON.stringify(tree, null, 2))
    return tree;
  };
}

await compile(
  {
    path: '/Users/nth/code/ai-jsx/packages/examples/src/sample.mdx',
    // value: partialMarkdown,
    value: fullMarkdown,
  },
  {
    remarkPlugins: [[remarkPlugin, { throwOnError: true, strict: true }]],
    rehypePlugins: [[rehypePlugin, { throwOnError: true, strict: true }]],
  }
);

interface SerializedComponent {
  $$type: 'element';
  $$component: string;
  props: Jsonifiable;
}

type Props = Jsonifiable & {
  children?: Jsonifiable;
};

function convertAstToComponent(ast: Node): SerializedComponent | null {
  const { type, tagName, children = [], name, attributes = [] } = ast;

  let component = '';
  let props: Props = {};

  switch (type) {
    case 'root': {
      component = 'div';
      // @ts-expect-error
      props.children = _.compact(children.map(convertAstToComponent));
      break;
    }
    case 'element': {
      component = tagName!;
      // @ts-expect-error
      props.children = _.compact(children.map(convertAstToComponent));
      break;
    }
    case 'mdxJsxFlowElement': {
      component = name!;
      // @ts-expect-error
      props = attributes.reduce<Jsonifiable>((acc: any, attr: any) => {
        if (attr.value?.type) {
          // E.g. <A b={null} />
          throw new Error(
            `Unimplemented code path: handling a React component with a non-trivial prop ${JSON.stringify(
              attr.value,
              null,
              2
            )}`
          );
        }
        acc[attr.name] = attr.value === null ? true : attr.value;
        return acc;
      }, {});
      // @ts-expect-error
      props.children = _.compact(children.map(convertAstToComponent));
      break;
    }
    case 'text': {
      if (ast.value === '\n') {
        // return <br />
        return { $$type: 'element', $$component: 'br', props: {} };
      }
      return { $$type: 'element', $$component: 'p', props: { children: ast.value } };
    }
    // We handle the imports separately.
    case 'mdxjsEsm': {
      return null;
    }
    default: {
      throw new Error(`Unhandled type: ${JSON.stringify(ast, null, 2)}`);
    }
  }

  return {
    $$type: 'element',
    $$component: component,
    props,
  };
}

const serializedComponent = convertAstToComponent(ast!);
console.log(JSON.stringify(serializedComponent, null, 2));

export type Component<P> = (props: P) => Renderable;
export type Literal = string | number | null | undefined | boolean;
export interface Element<P extends {}> {
  tag: Component<P>;
  props: P;
  render: () => Renderable;
}
export type Node = Element<any> | Literal | Node[];

export type Renderable = Node | Promise<Renderable> | AsyncGenerator<Renderable>;

export function isElement(value: unknown): value is Element<any> {
  return value !== null && typeof value === 'object' && 'tag' in value;
}

export function Fragment({ children }: { children: Node }): Renderable {
  return children;
}
export function debug(value: unknown, indent: string = '', context: 'code' | 'children' | 'props' = 'code'): string {
  if (typeof value === 'string') {
    if (context === 'props' || context === 'code') {
      return JSON.stringify(value);
    }
    return `{${JSON.stringify(value)}}`;
  } else if (typeof value === 'number' || typeof value === 'bigint') {
    if (context === 'props' || context === 'children') {
      return `{${value.toString()}}`;
    }
    return value.toString();
  } else if (typeof value === 'boolean' || typeof value === 'undefined') {
    return '';
  } else if (value === null) {
    switch (context) {
      case 'code':
        return 'null';
      case 'children':
        return '{null}';
      case 'props':
        return '{null}';
    }
  } else if (isElement(value)) {
    const tag = value.tag === Fragment ? '' : value.tag.name;
    const childIndent = `${indent}  `;
    const children = debug(value.props.children, childIndent, 'children');

    const results = [];
    if (value.props) {
      for (const key of Object.keys(value.props)) {
        const propValue = value.props[key];
        if (key === 'children' || propValue === undefined) {
          continue;
        } else {
          results.push(` ${key}=${debug(propValue, indent, 'props')}`);
        }
      }
    }

    const propsString = results.join('');

    const child =
      children !== ''
        ? `<${tag}${propsString}>\n${childIndent}${children}\n${indent}</${tag}>`
        : value.tag !== Fragment
        ? `<${tag}${propsString} />`
        : '<></>';

    switch (context) {
      case 'code':
      case 'children':
        return child;
      case 'props':
        return `{${child}}`;
    }
  } else if (Array.isArray(value)) {
    const filter =
      context === 'children'
        ? (x: unknown) =>
            x !== undefined && x !== null && typeof x !== 'boolean' && !(Array.isArray(x) && x.length == 0)
        : () => true;
    const values = value.filter(filter).map((v) => debug(v, indent, context === 'children' ? 'children' : 'code'));
    switch (context) {
      case 'children':
        return values.join(`\n${indent}`);
      case 'props':
        return `{[${values.join(', ')}]}`;
      case 'code':
        return `[${values.join(', ')}]`;
    }
  } else if (typeof value === 'object') {
    if (context === 'props' || context === 'children') {
      return `{${JSON.stringify(value)}}`;
    }
    return JSON.stringify(value);
  } else if (typeof value === 'function') {
    const toRender = value.name === '' ? value.toString() : value.name;
    if (context === 'props' || context === 'children') {
      return `{${toRender}}`;
    }
    return toRender;
  } else if (typeof value === 'symbol') {
    if (context === 'props' || context === 'children') {
      return `{${value.toString()}}`;
    }
    return value.toString();
  }

  return '';
}
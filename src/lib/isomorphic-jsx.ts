export type Component<P> = (props: P) => Renderable;
export type Renderable = Node | Promise<Renderable> | AsyncGenerator<Renderable>;
export type Node = Element<any> | Literal | Node[];
export type Literal = string | number | null | undefined | boolean;

export interface Element<P extends {}> {
  tag: Component<P>;
  props: P;
  render: () => Renderable;
}

export function isElement(value: unknown): value is Element<any> {
  return value !== null && typeof value === 'object' && 'tag' in value;
}

export function Fragment({ children }: { children: Node }): Renderable {
  return children;
}

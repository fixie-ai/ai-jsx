function assignName<T extends Function>(name: string, component: T): T {
  return {
    [name](...args: any[]) {
      return component.apply(this, args);
    },
  }[name] as unknown as T;
}

export type ComponentMap<T extends Record<string, Function> = Record<string, Function>> = T & {
  idToComponent: Map<string, Function>;
  componentToId: Map<Function, string>;
};

/**
 * Creates a component map that allows components to be serialized.
 */
export function makeComponentMap<T extends Record<string, Function>>(components: T): ComponentMap<T> {
  const componentMap = new Map<string, any>();
  const inverseMap = new Map<any, string>();

  const result: ComponentMap<T> = {
    ...components,
    idToComponent: componentMap,
    componentToId: inverseMap,
  };
  for (const [name, component] of Object.entries(components)) {
    const withAssignedName = assignName(name, component);
    (result as any)[name] = withAssignedName;
    componentMap.set(name, withAssignedName);
    inverseMap.set(withAssignedName, name);
  }

  return result;
}

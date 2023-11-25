// Stubs out the AsyncLocalStorage API for non-Node environments. (Note that it won't actually propagate context.)
export class AsyncLocalStorage<T> {
  private storage: T | undefined = undefined;

  getStore(): T | undefined {
    return this.storage;
  }

  run<R, TArgs extends any[]>(store: T, callback: (...args: TArgs) => R, ...args: TArgs): R {
    this.storage = store;
    const result = callback(...args);
    this.storage = undefined;
    return result;
  }
}

import { RenderElement } from './render3.js';

export interface RenderEvents {
  complete: CompleteEvent;
  abort: AbortEvent;
  error: ErrorEvent;
}

export class CompleteEvent extends Event {
  constructor() {
    super('complete');
  }
}

export class AbortEvent extends Event {
  constructor() {
    super('abort');
  }
}

export class ErrorEvent extends Event {
  constructor(readonly error: Error, readonly source: RenderElement) {
    super('error');
  }
}

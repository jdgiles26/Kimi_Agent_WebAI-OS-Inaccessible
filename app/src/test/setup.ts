import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => cleanup());

// jsdom doesn't implement these — many UI components touch them.
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });

  if (!window.HTMLElement.prototype.scrollTo) {
    window.HTMLElement.prototype.scrollTo = () => {};
  }
}

// WebGPU detection used by the runtime.
Object.defineProperty(globalThis.navigator, 'gpu', {
  configurable: true,
  value: undefined,
});

// transformers.js shouldn't be imported in unit tests, but if it is, this
// guards against the worker crashing the suite.
(globalThis as any).Worker = class FakeWorker {
  postMessage() {}
  terminate() {}
  addEventListener() {}
};

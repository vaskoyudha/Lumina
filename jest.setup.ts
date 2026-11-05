import "@testing-library/jest-dom";
import { TextDecoder, TextEncoder } from "node:util";

/**
 * jsdom gaps that Next.js/React 19 code touches in tests.
 */

Object.assign(global, { TextEncoder, TextDecoder });

if (typeof window !== "undefined") {
  if (!window.matchMedia) {
    Object.defineProperty(window, "matchMedia", {
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
  }

  if (!window.ResizeObserver) {
    class ResizeObserverStub {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    Object.defineProperty(window, "ResizeObserver", {
      writable: true,
      value: ResizeObserverStub,
    });
  }

  Object.defineProperty(window, "print", {
    writable: true,
    value: () => {},
  });

  /*
    Object URLs. jsdom does not implement them, and the composer mints one per
    attachment — without these the attachment path throws in tests and the one
    capability worth testing (a filename reaching the engine) is untestable.
  */
  if (!window.URL.createObjectURL) {
    let objectUrl = 0;
    Object.defineProperty(window.URL, "createObjectURL", {
      writable: true,
      value: () => {
        objectUrl += 1;
        return `blob:jest/${objectUrl}`;
      },
    });
    Object.defineProperty(window.URL, "revokeObjectURL", {
      writable: true,
      value: () => {},
    });
  }
}

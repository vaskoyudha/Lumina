import "@testing-library/jest-dom";
import { webcrypto } from "node:crypto";
import { TextDecoder, TextEncoder } from "node:util";
import { deserialize, serialize } from "node:v8";

/**
 * jsdom gaps that Next.js/React 19 code touches in tests.
 */

Object.assign(global, { TextEncoder, TextDecoder });

/*
  jsdom ships `crypto.getRandomValues` but not `crypto.subtle`. The local entity
  ledger, the case store, the file hash and the wallet checksum all use
  `crypto.subtle.digest`; without this stub those paths silently no-op in tests
  and the privacy claims they carry would go unverified.
*/
if (!globalThis.crypto?.subtle) {
  Object.defineProperty(globalThis, "crypto", {
    configurable: true,
    writable: true,
    value: webcrypto,
  });
}

/* jsdom has no `structuredClone`; the case store clones every record it hands
   back so a caller cannot mutate the stored copy. */
if (!globalThis.structuredClone) {
  Object.defineProperty(globalThis, "structuredClone", {
    value: <T>(value: T): T => deserialize(serialize(value)) as T,
    configurable: true,
  });
}

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

  /* jsdom does not implement scrolling; the community filter panel scrolls the
     disclosure into view when the rail link targets it. */
  if (!window.Element.prototype.scrollIntoView) {
    Object.defineProperty(window.Element.prototype, "scrollIntoView", {
      writable: true,
      value: () => {},
    });
  }

  /*
    Object URLs. jsdom does not implement them, and the composer mints one per
    attachment — without these the attachment path throws in tests and the one
    capability worth testing (a filename reaching the engine) is untestable.
  */
  if (!window.URL.createObjectURL) {
    let objectUrl = 0;
    Object.defineProperty(window.URL, "createObjectURL", {
      configurable: true,
      writable: true,
      value: () => {
        objectUrl += 1;
        return `blob:jest/${objectUrl}`;
      },
    });
    Object.defineProperty(window.URL, "revokeObjectURL", {
      configurable: true,
      writable: true,
      value: () => {},
    });
  }
}

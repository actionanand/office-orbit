import { webcrypto } from 'node:crypto';

// Use real Web Crypto for PBKDF2 tests when jsdom only supplies getRandomValues.
if (!globalThis.crypto?.subtle) {
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
}

// Polyfills for running unit tests under jsdom (the default Vitest environment).
// Ionic components such as ion-menu and ion-split-pane query `window.matchMedia`,
// which jsdom does not implement.
if (!window.matchMedia) {
  window.matchMedia = (query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }) as MediaQueryList;
}

const installScrollTo = (prototype: object & { scrollTo?: unknown }) => {
  if (!prototype.scrollTo) {
    Object.defineProperty(prototype, 'scrollTo', { value: () => undefined, configurable: true });
  }
};

installScrollTo(Element.prototype as object & { scrollTo?: unknown });
installScrollTo(HTMLElement.prototype as object & { scrollTo?: unknown });

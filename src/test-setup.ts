import { webcrypto } from 'node:crypto';

// Use real Web Crypto for PBKDF2 tests when jsdom only supplies getRandomValues.
if (!globalThis.crypto?.subtle) {
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
}

const readBlob = <T>(blob: Blob, read: (reader: FileReader, value: Blob) => void): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error('Unable to read Blob.'));
    reader.onload = () => resolve(reader.result as T);
    read(reader, blob);
  });

// jsdom's Blob lacks the standard text() and arrayBuffer() methods in this test runtime.
// Preserve native implementations when they exist; production uses browser-native Blob APIs.
if (!Blob.prototype.text) {
  Object.defineProperty(Blob.prototype, 'text', {
    configurable: true,
    value(this: Blob): Promise<string> {
      return readBlob<string>(this, (reader, blob) => reader.readAsText(blob));
    },
  });
}

if (!Blob.prototype.arrayBuffer) {
  Object.defineProperty(Blob.prototype, 'arrayBuffer', {
    configurable: true,
    value(this: Blob): Promise<ArrayBuffer> {
      return readBlob<ArrayBuffer>(this, (reader, blob) => reader.readAsArrayBuffer(blob));
    },
  });
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

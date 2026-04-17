import "@testing-library/jest-dom";
import { TextEncoder, TextDecoder } from "node:util";

// react-router 7 expects Web-standard TextEncoder/Decoder in the global scope;
// jsdom does not provide them, so polyfill from Node's stdlib.
if (typeof globalThis.TextEncoder === "undefined") {
  globalThis.TextEncoder = TextEncoder as unknown as typeof globalThis.TextEncoder;
}
if (typeof globalThis.TextDecoder === "undefined") {
  globalThis.TextDecoder = TextDecoder as unknown as typeof globalThis.TextDecoder;
}

// jsdom does not implement the Web Animations API; kbar's KBarAnimator calls
// `element.animate(...)` on mount. Polyfill with a no-op shim so tests that
// render the palette don't blow up.
if (typeof Element !== "undefined" && typeof Element.prototype.animate !== "function") {
  (Element.prototype as unknown as { animate: () => Animation }).animate = function animate() {
    return {
      cancel: () => {},
      finish: () => {},
      onfinish: null,
      oncancel: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      play: () => {},
      pause: () => {},
      reverse: () => {},
    } as unknown as Animation;
  };
}

// kbar also asks for requestAnimationFrame in a couple of places; jsdom
// provides it but with quirks under Jest's fake timers. Provide a portable
// fallback if missing.
if (typeof globalThis.requestAnimationFrame === "undefined") {
  globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) =>
    setTimeout(() => cb(performance.now()), 16) as unknown as number) as typeof requestAnimationFrame;
  globalThis.cancelAnimationFrame = ((handle: number) =>
    clearTimeout(handle as unknown as NodeJS.Timeout)) as typeof cancelAnimationFrame;
}

// kbar's KBarAnimator observes the size of the inner palette. jsdom does not
// ship ResizeObserver, so register a noop stand-in.
if (typeof globalThis.ResizeObserver === "undefined") {
  class NoopResizeObserver implements ResizeObserver {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
  (globalThis as unknown as { ResizeObserver: typeof ResizeObserver }).ResizeObserver =
    NoopResizeObserver as unknown as typeof ResizeObserver;
}

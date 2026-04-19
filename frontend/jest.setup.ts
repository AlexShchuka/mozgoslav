import "@testing-library/jest-dom";
import {TextDecoder, TextEncoder} from "node:util";

if (typeof globalThis.TextEncoder === "undefined") {
    globalThis.TextEncoder = TextEncoder as unknown as typeof globalThis.TextEncoder;
}
if (typeof globalThis.TextDecoder === "undefined") {
    globalThis.TextDecoder = TextDecoder as unknown as typeof globalThis.TextDecoder;
}

if (typeof Element !== "undefined" && typeof Element.prototype.animate !== "function") {
    (Element.prototype as unknown as { animate: () => Animation }).animate = function animate() {
        return {
            cancel: () => {
            },
            finish: () => {
            },
            onfinish: null,
            oncancel: null,
            addEventListener: () => {
            },
            removeEventListener: () => {
            },
            play: () => {
            },
            pause: () => {
            },
            reverse: () => {
            },
        } as unknown as Animation;
    };
}

if (typeof globalThis.requestAnimationFrame === "undefined") {
    globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) =>
        setTimeout(() => cb(performance.now()), 16) as unknown as number) as typeof requestAnimationFrame;
    globalThis.cancelAnimationFrame = ((handle: number) =>
        clearTimeout(handle as unknown as NodeJS.Timeout)) as typeof cancelAnimationFrame;
}

if (typeof globalThis.ResizeObserver === "undefined") {
    class NoopResizeObserver implements ResizeObserver {
        observe(): void {
        }

        unobserve(): void {
        }

        disconnect(): void {
        }
    }

    (globalThis as unknown as { ResizeObserver: typeof ResizeObserver }).ResizeObserver =
        NoopResizeObserver as unknown as typeof ResizeObserver;
}

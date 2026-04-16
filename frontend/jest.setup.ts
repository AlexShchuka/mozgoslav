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

---
id: api-internal-contract-with-swift-helper
status: proposed
audience: agent
---

# api-internal-contract-with-swift-helper

## context
The Swift dictation helper sends `POST /_internal/devices/changed` and `POST /_internal/hotkey/event` to the backend over the loopback bridge. The contract lives in two C# DTOs (`AudioDeviceChangePayload`, `HotkeyEvent`) and one Swift caller — no shared spec.

## problem
- A schema change on either side fails silently until runtime — the helper sends a payload the backend rejects with 400, dictation stops working.
- No contract test exists across the language boundary.
- Risk multiplies as more inbound paths from the helper or new native components are added (recording controls, vault sync, etc.).

## proposal
Pick a shared contract format and stick to it for every cross-language inbound path:

- option A — JSON Schema files under `contracts/swift-helper/`. C# side has a generated test that round-trip serialises/deserialises against the schema. Swift side validates outgoing payload against the same schema (`Foundation` + a small validator).
- option B — protobuf with `.proto` files under `contracts/`. Both C# and Swift get codegen. Heavier but single source of truth.

In addition (orthogonal to the format choice):
- Add an `X-Helper-Protocol-Version` header on every `_internal/*` POST. Backend rejects unknown major version with a clear error.
- Backend integration test asserts current schema matches checked-in JSON examples.
- Swift side has equivalent test in `swift test`.
- CI guard: a PR that touches `Endpoints/InternalEndpoints.cs` or any DTO under `_internal/*` AND does NOT touch `contracts/swift-helper/` → red.

## acceptance
- [ ] Both inbound payloads are validated against checked-in examples in CI.
- [ ] A schema change requires a coordinated commit touching both backend and `native/MozgoslavDictationHelper/`.
- [ ] Helper protocol version field is enforced on the backend.
- [ ] Swift helper rejects 4xx responses with a clear log line, not a silent retry loop.

## rejected
| alt | reason |
|---|---|
| OpenAPI for `_internal/*` only | overkill for two endpoints; OpenAPI tooling on Swift side is weak. |
| Trust manual coordination | proven insufficient at scale. |
| gRPC | extra runtime dependency on both sides; loopback HTTP is enough. |

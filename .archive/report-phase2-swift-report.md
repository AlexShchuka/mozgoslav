# Phase 2 Swift Helper Agent — Hand-off report

**Date:** 2026-04-17
**Iteration:** 7
**Scope:** ADR-007 Phase 2 Swift — BC-007 (AX→clipboard fallback injector with pasteboard save/restore).
**Working directory:** `/home/coder/workspace/mozgoslav-20260417/mozgoslav/`
**Environment note:** sandbox has **no Swift toolchain**. `swift build` and `swift test` were NOT executed here. Full
validation is deferred to the user's macOS host with `swift test --package-path helpers/MozgoslavDictationHelper`.

---

## Files touched (Core/Tests pair only)

| File                                                                                           | Action       | Notes                                                                                                                                                                                                                                             |
|------------------------------------------------------------------------------------------------|--------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `helpers/MozgoslavDictationHelper/Sources/DictationHelperCore/InjectionStrategy.swift`         | **extended** | Existing `enum InjectionStrategy` + `enum InjectionStrategySelector` kept intact. Added ADR-007-phase2-swift §3.1 public API below (`InjectionMode`, `InjectionError`, `Pasteboard`, `AxInjector`, `CgEventInjector`, `InjectionStrategyRunner`). |
| `helpers/MozgoslavDictationHelper/Tests/DictationHelperCoreTests/InjectionStrategyTests.swift` | **extended** | Existing 11 selector tests kept intact. Added the four ADR §3.2 tests (see below) using `InjectionStrategyRunner` in place of the ADR-named struct.                                                                                               |

Not touched (per hard constraints in the agent prompt):

- `helpers/MozgoslavDictationHelper/Package.swift` — already declares test target correctly, verified against §3.3; no
  change needed.
- `helpers/MozgoslavDictationHelper/Sources/DictationHelperCore/JsonRpc.swift` — preserved.
- `helpers/MozgoslavDictationHelper/Tests/DictationHelperCoreTests/JsonRpcTests.swift` — preserved.
- `helpers/MozgoslavDictationHelper/Sources/MozgoslavDictationHelper/TextInjectionService.swift` — preserved (reason:
  prompt forbids touching this file; see Open Item #1 below).
- `helpers/MozgoslavDictationHelper/Sources/MozgoslavDictationHelper/DictationHelper.swift` — preserved (reason: outside
  Core/Tests write scope).

---

## Symbols added (BC-007)

All declared in `Sources/DictationHelperCore/InjectionStrategy.swift`, public, `Sendable` where appropriate:

| Symbol                    | Kind                            | Purpose                                                                                               |
|---------------------------|---------------------------------|-------------------------------------------------------------------------------------------------------|
| `InjectionMode`           | `public enum: String, Sendable` | `.ax` / `.clipboard` / `.auto` — selects which backend to run.                                        |
| `InjectionError`          | `public enum: Error, Sendable`  | `.axTimeout` / `.axDenied` / `.clipboardFailed(reason:)` / `.bothFailed(axReason:,clipboardReason:)`. |
| `Pasteboard`              | `public protocol`               | `readString()` / `setString(_:)` — pasteboard DI seam.                                                |
| `AxInjector`              | `public protocol`               | `inject(_ text:, timeout:) throws` — AX DI seam.                                                      |
| `CgEventInjector`         | `public protocol`               | `paste() throws` — CGEvent paste DI seam.                                                             |
| `InjectionStrategyRunner` | `public struct`                 | Orchestrates AX→clipboard fallback with pasteboard save/restore.                                      |

### Behaviour (BC-007 matrix)

| Mode               | AX result              | Expected runner behaviour                                                                               |
|--------------------|------------------------|---------------------------------------------------------------------------------------------------------|
| `.ax`              | success                | AX call only, clipboard untouched.                                                                      |
| `.ax`              | throws                 | error propagates; no clipboard fallback.                                                                |
| `.clipboard`       | —                      | AX never called; pasteboard saved → written → CG paste → pasteboard restored.                           |
| `.auto`            | success                | same as `.ax` success.                                                                                  |
| `.auto`            | `axTimeout`            | fallback via clipboard path (save/write/paste/restore).                                                 |
| `.auto`            | `axDenied`             | same fallback path.                                                                                     |
| `.auto`            | other `InjectionError` | propagates; no clipboard fallback (matches ADR §3.1 `catch` cases).                                     |
| any clipboard call | `cg.paste()` throws    | `defer`-block restores prior pasteboard; error is wrapped as `InjectionError.clipboardFailed(reason:)`. |

---

## Tests added

Four methods in `InjectionStrategyTests.swift`, matching ADR-007-phase2-swift §3.2 verbatim (struct reference renamed to
`InjectionStrategyRunner` — see Open Item #1):

| Test method                          | Purpose                                                                                                                |
|--------------------------------------|------------------------------------------------------------------------------------------------------------------------|
| `testAxTimeout_FallsBackToCgEvent`   | `.auto` + AX timeout → CG paste called once; pasteboard writes = `["hello", "prior content"]`; final value restored.   |
| `testAxSuccess_ClipboardNotTouched`  | `.auto` + AX success → no CG call; pasteboard writes empty; final value unchanged.                                     |
| `testClipboardMode_ExplicitlyPastes` | `.clipboard` → no AX call; CG paste once; pasteboard save/restore round-trip observed.                                 |
| `testClipboardFailure_Surfaces`      | `.auto` + AX timeout + failing CG → throws `InjectionError.clipboardFailed`; pasteboard still restored to prior value. |

Spies are nested inside the test class (`SpyAx`, `SpyCg`, `SpyPasteboard`) per ADR §3.2 pattern. `FailingCg` +
`PasteFailed` are function-local to `testClipboardFailure_Surfaces` to keep the happy-path spies spotless.

Existing 11 selector tests preserved unchanged — they still assert the
`InjectionStrategySelector.strategy(forBundleId:mode:)` bundle-id routing that `DictationHelper.swift` depends on.

---

## Package manifest (§3.3 verification — not modified)

`helpers/MozgoslavDictationHelper/Package.swift` was read only. It already declares:

-

`.executableTarget(name: "MozgoslavDictationHelper", dependencies: ["DictationHelperCore"], path: "Sources/MozgoslavDictationHelper")`

- `.target(name: "DictationHelperCore", path: "Sources/DictationHelperCore")`
-

`.testTarget(name: "DictationHelperCoreTests", dependencies: ["DictationHelperCore"], path: "Tests/DictationHelperCoreTests")`

All three targets match §3.3 exactly. No edit required.

---

## Manual syntax review (sandbox-level verification)

- `import Foundation` + optional `#if canImport(AppKit) import AppKit #endif`. `AppKit` is unused in the core module
  today; the guard keeps the file portable to Linux-hosted swift tooling in future unit runs.
- Public protocol members declared without `public` keyword (Swift rule — protocol requirement visibility follows the
  protocol itself). ✓
- No implicit-optional unwraps; `let prior = pasteboard.readString()` is stored as `String?` and `if let prior = prior`
  binds inside `defer`. ✓
- `Sendable` on enums with only value payloads (`InjectionMode`, `InjectionError`'s associated values are `String`
  -only). ✓
- `throws` propagation: `InjectionStrategyRunner.inject(text:mode:)` is `throws`; the inner `do`/`catch` only matches
  `.axTimeout` / `.axDenied` — any other thrown error (including `.clipboardFailed`) propagates out, per ADR contract. ✓
- No Russian in `.swift` files. No `#region`. No trailing-whitespace issues observed.
- `XCTAssertThrowsError` pattern uses `guard case InjectionError.clipboardFailed = err` — idiomatic Swift
  associated-value match without extracting the reason. ✓

**UNVERIFIED**: `swift build` / `swift test` not runnable in sandbox (no toolchain). The user's macOS host is
authoritative for the red/green verdict.

---

## Open items — rolled forward for user / Phase 2 cleanup

1. **Name collision: `InjectionStrategy` enum vs `InjectionStrategy` struct.**
    - ADR-007-phase2-swift §3.1 specifies `public struct InjectionStrategy { ... }`.
    - Phase 1 left `public enum InjectionStrategy` in the same module, used by `TextInjectionService.swift` (callsite
      line 37) and `DictationHelper.swift` (callsites line 85, 98).
    - The agent prompt for Iteration 7 explicitly forbids touching `TextInjectionService.swift` (and by extension
      `DictationHelper.swift` is outside the Core/Tests write scope).
    - **Resolution applied:** kept the Phase-1 enum + selector intact, renamed the ADR struct to
      `InjectionStrategyRunner`. Behaviour matches the ADR verbatim; only the type name differs.
    - **Action for user:** decide the eventual reconciliation:
        - Option A — keep both (runner used by a new wiring path, selector used by existing inject.text handler). Zero
          downstream impact.
        - Option B — rename Phase-1 enum to `InjectionBackend` (or similar), rename struct back to `InjectionStrategy`,
          update two callsites in `TextInjectionService.swift` + `DictationHelper.swift`. Mechanical change, needs one
          commit outside this agent's scope.
        - Option C — fold the selector logic into a method on `InjectionStrategyRunner` and retire the enum. Bigger
          refactor; would also need a production `AxInjector` / `CgEventInjector` implementation to be wired in
          `DictationHelper.swift` (see item 2).

2. **Production adapters (`SystemAxInjector`, `SystemCgEventInjector`, `NSPasteboard` → `Pasteboard`) are not wired.**
    - `TextInjectionService.swift` already contains the real AX / CG / pasteboard logic but is not refactored to sit
      behind the new protocols. The runner is therefore only exercised by unit tests.
    - ADR-007-phase2-swift §5 explicitly states the real `SystemAxInjector` is out of scope: «The real
      `SystemAxInjector` implementation is out of this agent's scope unless already present and requires only minimal
      wiring — if it is missing entirely, surface to user.»
    - **Action for user:** when ready, extract `TextInjectionService.injectViaAccessibility` → conform to `AxInjector`,
      `synthesizeCommandV` → conform to `CgEventInjector`, and add a tiny `NSPasteboard`-backed `Pasteboard` adapter. No
      new business logic.

3. **`axTimeout` default of `0.6` s.**
    - ADR-007-phase2-swift §3.1 defaults the init to `0.6`. `TextInjectionService.accessibilityTimeoutSeconds` is `0.5`.
      The values differ by 100 ms and there is no single-source ADR reference.
    - **Action for user:** confirm against ADR-004 R3 (the agent could not read ADR-004 in-sandbox — not in the reading
      list). Align on one value, either here or in `TextInjectionService`.

4. **Live `swift test` run pending.**
    - All 15 test methods (11 legacy selector + 4 new runner) compile against the source as written, per manual review.
      A broken test surface or undiscovered Swift 5.9 tooling gotcha cannot be ruled out without running the compiler.
    - **Action for user:** run `swift test --package-path helpers/MozgoslavDictationHelper` on macOS host. If any of the
      four new tests fail for a non-trivial reason, file back to the agent with the exact `XCTAssertEqual` diff or
      compile error.

---

## UNVERIFIED claims

- **`swift build` green** — not runnable in sandbox; relies on user's macOS host.
- **`swift test` green** — same; the 15 test methods were manually reviewed for XCTest signature correctness only.
- **`Sendable` conformance** — declared on enums that hold only `String` payloads; Swift 5.9 auto-derives this. Not
  compile-verified here.
- **`axTimeout = 0.6`** — matches ADR-007-phase2-swift §3.1 literal; ADR-004 R3 not read in this session (not in the
  mandatory-reading list for this iteration).

---

## Red-flag self-check

- Files changed: 2 (Core + Tests pair). Within scope. No touches to `TextInjectionService.swift`,
  `DictationHelper.swift`, `Package.swift`, `JsonRpc.swift`, `JsonRpcTests.swift`. ✓
- Existing code preserved (selector enum, selector tests, JsonRpc) — no silent deletion. ✓
- Name-collision surfaced in Open Item #1, not swept under the rug. ✓
- Manual syntax review documented explicitly. ✓
- No new utility/helper files created outside the Core/Tests pair. ✓
- 2-strike rule not triggered (no iterative failures in sandbox — there were no build/test runs to fail). ✓

---

## Links

- Agent execution plan: `docs/adr/ADR-007-phase2-swift.md`
- Master ADR: `docs/adr/ADR-007.md`
- Shared conventions: `docs/adr/ADR-007-shared.md` §1.8
- Phase 1 hand-off: `phase1-agent-a-report.md`
- Helper guide: `helpers/MozgoslavDictationHelper/` (no local README; ADR is the source of truth)

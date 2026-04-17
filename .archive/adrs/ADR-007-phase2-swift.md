# ADR-007 — Phase 2 Swift Helper Agent

Read first: `ADR-007.md`, `ADR-007-shared.md` (§1.8 Swift conventions), `helpers/MozgoslavDictationHelper/README.md` if present, root `CLAUDE.md`. Precondition: **Phase 1 Agent A acceptance passed**. Runs parallel to Backend / Frontend / Python agents. Works in `helpers/MozgoslavDictationHelper/` only.

**Critical environment note.** The sandbox **does not have Swift installed**. The agent writes source only; compilation and test execution happen on the user's macOS host with `swift test --package-path helpers/MozgoslavDictationHelper`.

---

## 0. Goal and definition of done

**Goal.** Restore / add unit tests and the implementation for `InjectionStrategy.auto` — on AX timeout or failure the helper falls back to a CGEvent-based clipboard paste, restoring the prior clipboard contents afterwards. Behaviour matches BC-007.

**DoD (on user's Mac host, verified post-agent):**

```bash
cd helpers/MozgoslavDictationHelper
swift build
swift test
```

Both green. Inside the pod, the agent's responsibility ends at «source compiles in the file-level TextMate sense» (no trivial Swift syntax errors per manual review) and the test files exist with well-formed `XCTest` signatures.

---

## 1. Scope

| BC | Deliverable |
|----|-------------|
| BC-007 | `InjectionStrategy.inject(text:, mode:"auto")` — tries AX, on timeout / failure falls back to CGEvent clipboard paste with save/restore. |

Existing code files at (verify in your worktree):
- `helpers/MozgoslavDictationHelper/Sources/DictationHelperCore/InjectionStrategy.swift` — to be created or restored.
- `helpers/MozgoslavDictationHelper/Sources/DictationHelperCore/FocusedAppDetector.swift` — adjacent, may exist.
- `helpers/MozgoslavDictationHelper/Tests/DictationHelperCoreTests/InjectionStrategyTests.swift` — target file (may have been deleted; restore).
- `helpers/MozgoslavDictationHelper/Tests/DictationHelperCoreTests/JsonRpcTests.swift` — existing; fixture pattern reference.
- `helpers/MozgoslavDictationHelper/Package.swift` — do **not** modify beyond adding the test target if it is currently missing.

---

## 2. Pre-flight (in sandbox)

```bash
cd /home/coder/workspace/mozgoslav-20260417/mozgoslav

# 1. Inspect the package manifest
cat helpers/MozgoslavDictationHelper/Package.swift

# 2. List existing Swift files
find helpers/MozgoslavDictationHelper -name "*.swift" | sort

# 3. Read any existing InjectionStrategy test fixture (canon JSON-RPC structure)
cat helpers/MozgoslavDictationHelper/Tests/DictationHelperCoreTests/JsonRpcTests.swift
```

If `InjectionStrategyTests.swift` exists — read it; the test fixture shape may already define the red state you need to extend. If it is missing — restore from the contract in this file (it references public symbols that must exist in `InjectionStrategy`, turning «missing symbol» compile errors into the red state).

---

## 3. Implementation

### 3.1 Public API

`helpers/MozgoslavDictationHelper/Sources/DictationHelperCore/InjectionStrategy.swift`:

```swift
import Foundation
#if canImport(AppKit)
import AppKit
#endif

public enum InjectionMode: String {
    case ax
    case clipboard
    case auto
}

public enum InjectionError: Error {
    case axTimeout
    case axDenied
    case clipboardFailed(reason: String)
    case bothFailed(axReason: String, clipboardReason: String)
}

public protocol Pasteboard {
    func readString() -> String?
    func setString(_ value: String)
}

public protocol AxInjector {
    /// Attempts AX-based text injection. Must throw `InjectionError.axTimeout` on timeout.
    func inject(_ text: String, timeout: TimeInterval) throws
}

public protocol CgEventInjector {
    /// Performs a `Cmd+V` key-down/key-up sequence.
    func paste() throws
}

public struct InjectionStrategy {
    private let ax: AxInjector
    private let cg: CgEventInjector
    private let pasteboard: Pasteboard
    private let axTimeout: TimeInterval

    public init(ax: AxInjector, cg: CgEventInjector, pasteboard: Pasteboard, axTimeout: TimeInterval = 0.6) {
        self.ax = ax
        self.cg = cg
        self.pasteboard = pasteboard
        self.axTimeout = axTimeout
    }

    public func inject(text: String, mode: InjectionMode) throws {
        switch mode {
        case .ax:
            try ax.inject(text, timeout: axTimeout)
        case .clipboard:
            try pasteViaClipboard(text)
        case .auto:
            do {
                try ax.inject(text, timeout: axTimeout)
            } catch InjectionError.axTimeout {
                try pasteViaClipboard(text)
            } catch InjectionError.axDenied {
                try pasteViaClipboard(text)
            }
        }
    }

    private func pasteViaClipboard(_ text: String) throws {
        let prior = pasteboard.readString()
        pasteboard.setString(text)
        defer {
            if let prior = prior {
                pasteboard.setString(prior)
            }
        }
        do {
            try cg.paste()
        } catch {
            throw InjectionError.clipboardFailed(reason: "\(error)")
        }
    }
}
```

### 3.2 Tests

`helpers/MozgoslavDictationHelper/Tests/DictationHelperCoreTests/InjectionStrategyTests.swift`:

```swift
import XCTest
@testable import DictationHelperCore

final class InjectionStrategyTests: XCTestCase {

    // Spies
    final class SpyAx: AxInjector {
        var throwTimeoutCount = 0
        var calls: [(String, TimeInterval)] = []
        func inject(_ text: String, timeout: TimeInterval) throws {
            calls.append((text, timeout))
            if throwTimeoutCount > 0 {
                throwTimeoutCount -= 1
                throw InjectionError.axTimeout
            }
        }
    }

    final class SpyCg: CgEventInjector {
        var pasteCalls = 0
        func paste() throws { pasteCalls += 1 }
    }

    final class SpyPasteboard: Pasteboard {
        var value: String? = "prior content"
        var writes: [String] = []
        func readString() -> String? { value }
        func setString(_ value: String) {
            writes.append(value)
            self.value = value
        }
    }

    func testAxTimeout_FallsBackToCgEvent() throws {
        let ax = SpyAx()
        let cg = SpyCg()
        let pb = SpyPasteboard()
        ax.throwTimeoutCount = 1

        let strategy = InjectionStrategy(ax: ax, cg: cg, pasteboard: pb)

        try strategy.inject(text: "hello", mode: .auto)

        XCTAssertEqual(ax.calls.count, 1)
        XCTAssertEqual(cg.pasteCalls, 1)
        // Prior pasteboard content must be restored.
        XCTAssertEqual(pb.value, "prior content")
        // "hello" was set, then restored.
        XCTAssertEqual(pb.writes, ["hello", "prior content"])
    }

    func testAxSuccess_ClipboardNotTouched() throws {
        let ax = SpyAx()
        let cg = SpyCg()
        let pb = SpyPasteboard()

        let strategy = InjectionStrategy(ax: ax, cg: cg, pasteboard: pb)

        try strategy.inject(text: "hello", mode: .auto)

        XCTAssertEqual(ax.calls.count, 1)
        XCTAssertEqual(cg.pasteCalls, 0)
        XCTAssertEqual(pb.writes, [])
        XCTAssertEqual(pb.value, "prior content")
    }

    func testClipboardMode_ExplicitlyPastes() throws {
        let ax = SpyAx()
        let cg = SpyCg()
        let pb = SpyPasteboard()

        let strategy = InjectionStrategy(ax: ax, cg: cg, pasteboard: pb)

        try strategy.inject(text: "explicit", mode: .clipboard)

        XCTAssertEqual(ax.calls.count, 0)
        XCTAssertEqual(cg.pasteCalls, 1)
        XCTAssertEqual(pb.writes, ["explicit", "prior content"])
    }

    func testClipboardFailure_Surfaces() {
        struct PasteFailed: Error {}
        final class FailingCg: CgEventInjector {
            func paste() throws { throw PasteFailed() }
        }

        let ax = SpyAx()
        let cg = FailingCg()
        let pb = SpyPasteboard()
        ax.throwTimeoutCount = 1

        let strategy = InjectionStrategy(ax: ax, cg: cg, pasteboard: pb)

        XCTAssertThrowsError(try strategy.inject(text: "hello", mode: .auto)) { err in
            guard case InjectionError.clipboardFailed = err else {
                XCTFail("expected clipboardFailed, got \(err)")
                return
            }
        }

        // Even on failure the prior pasteboard content must be restored.
        XCTAssertEqual(pb.value, "prior content")
    }
}
```

### 3.3 Package manifest (verify only — do not edit unless strictly required)

```bash
cat helpers/MozgoslavDictationHelper/Package.swift
```

Must declare:
- `.executableTarget(name: "MozgoslavDictationHelper", dependencies: ["DictationHelperCore"])`
- `.target(name: "DictationHelperCore", dependencies: [])`
- `.testTarget(name: "DictationHelperCoreTests", dependencies: ["DictationHelperCore"])`

If the test target is missing — add it exactly as above. If it exists — do **not** modify.

---

## 4. Acceptance checklist

- [ ] `helpers/MozgoslavDictationHelper/Sources/DictationHelperCore/InjectionStrategy.swift` exists and compiles (syntax-check by manual review; full check is on user's Mac).
- [ ] `helpers/MozgoslavDictationHelper/Tests/DictationHelperCoreTests/InjectionStrategyTests.swift` exists with the four test methods.
- [ ] `Package.swift` declares the test target (unchanged if already declared).
- [ ] `phase2-swift-report.md` at repo root — explicitly states «sandbox lacks Swift; source written only; tests executed on user's Mac host». List files touched, symbols added, and any concrete concern (e.g. «`axTimeout` value 0.6 s is placeholder — user to confirm against ADR-004 R3»).

---

## 5. Escalation triggers

- `Package.swift` already declares the test target with a different name → stop; do not rename. Surface to user.
- AX macOS API that is load-bearing in production (`AXUIElementCopyAttributeValue`, `AXUIElementSetAttributeValue`) — the production `AxInjector` implementation likely uses these; sandbox cannot test it. The agent writes only the **mocked** contract (`AxInjector` protocol + unit tests). The real `SystemAxInjector` implementation is out of this agent's scope unless already present and requires only minimal wiring — if it is missing entirely, surface to user.
- Existing `JsonRpcTests.swift` depends on symbols that `InjectionStrategy` changes → stop; that's a cross-cutting change, escalate.

---

## 6. Skills

- `superpowers:test-driven-development` (mandatory — even though the red/green cycle is run on the user's Mac, the discipline applies: write test first, write impl second, user validates).
- `superpowers:verification-before-completion` (mandatory — verify manual syntax review is done for every file; flag anything an agent cannot check).

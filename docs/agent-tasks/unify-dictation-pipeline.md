# Aider task: unify dictation push-to-talk pipeline (mouse + keyboard → cursor injection)

## Goal

One push-to-talk pipeline with two interchangeable hotkey inputs:

- Press and hold hotkey → dictation starts.
- Release → dictation stops, transcript is injected **at the cursor** of the currently focused app.
- Two modes, user-selectable in Settings:
  - **Mouse**: `DictationHotkeyType="mouse"`, button from `DictationMouseButton` (default 5).
  - **Keyboard**: `DictationHotkeyType="keyboard"`, accelerator from `DictationKeyboardHotkey` (default `Right-Option`).

Both modes must drive the same code path that ends in `helper.injectText(polishedText, injectMode)`.

## Why this task exists

Today the codebase has two disjoint push-to-talk pipelines that both claim to be push-to-talk but only one of them writes under the cursor:

- **Pipeline A — works, writes under cursor.** `uiohook-napi` listens for mouse button 5 → `frontend/electron/dictation/HotkeyMonitor.ts` emits `press/release` → `DictationOrchestrator.handlePress/handleRelease` → `helper.captureStart` → JSON samples to `POST /api/dictation/push/{sessionId}` → `POST /api/dictation/stop/{sessionId}` returns `polishedText` → `helper.injectText(polishedText, injectMode)`. `helper.injectText` is called in exactly one place (`frontend/electron/dictation/DictationOrchestrator.ts:133`).
- **Pipeline B — runs today for keyboard accelerators, does NOT inject.** Swift helper's `hotkey.start` → `NativeHelperClient` emits `"hotkey"` → `DictationOrchestrator.onKeyboardHotkeyEvent` external callback → `main.ts forwardHotkeyToBackend` → `POST /_internal/hotkey/event` → backend SSE `/api/hotkey/stream` → renderer Dashboard starts MediaRecorder → WebM to `POST /api/dictation/{sessionId}/push` (ffmpeg path) → Dashboard shows transcript. Nobody calls `injectText` in this path.

Evidence in runtime logs:

- When the keyboard accelerator fires today: backend prints `Dictation session <id> started (source=dashboard)` and audio flows through `/api/dictation/{id}/push` (raw body, ffmpeg) — that is the renderer-driven MediaRecorder path, not the orchestrator-driven JSON-samples path.
- When Pipeline A fires (mouse5): source is `global-hotkey` and audio flows through `/api/dictation/push/{id}` (JSON samples from `DictationOrchestrator.pushAudioToBackend`).

`main.ts:418-419` hardcodes `mouseButton: 5, keyboardFallbackKeycode: null`, so keyboard accelerators have no path into Pipeline A today.

## Fix summary

Route the Swift helper's keyboard hotkey events into `DictationOrchestrator.handlePress/handleRelease` directly, the same way mouse events already are. Remove the renderer-SSE detour for push-to-talk. Keep the renderer-SSE path alive only for the legacy toggle mode (when `DictationPushToTalk=false`).

After the fix the decision is a single boolean at the orchestrator level: "which source do I listen to — uiohook mouse or Swift helper keyboard" — and everything downstream is shared.

## Repo conventions (read before editing)

- `mozgoslav/CLAUDE.md`: **NO COMMENTS** unless the WHY is non-obvious (hidden constraint, subtle invariant, workaround). Never narrate the what.
- `mozgoslav/frontend/CLAUDE.md`: no primary constructors in TS; feature-based; styled-components only for styling; no CSS modules; default exports for components, named for utilities.
- `mozgoslav/backend/CLAUDE.md`: one class per file; no primary constructors in C#; `sealed` on leaf classes; central package management (`Directory.Packages.props`); `dotnet test -maxcpucount:1`; integration tests use `TestDatabase`.
- No backend changes needed for this task. If you find yourself editing C# you have drifted — revert.

## Files to touch

### Must edit

1. `frontend/electron/dictation/DictationOrchestrator.ts` — accept a keyboard accelerator option; wire Swift-helper hotkey events to `handlePress/handleRelease`; stop exposing `onKeyboardHotkeyEvent` as a general side channel.
2. `frontend/electron/main.ts` — pass the new option based on settings; stop calling `onKeyboardHotkeyEvent` for push-to-talk; keep `forwardHotkeyToBackend` only for the toggle fallback.

### Must add

3. `frontend/electron/__tests__/DictationOrchestrator.test.ts` (or extend the existing test file if one exists) — unit test that a `"hotkey"` event with `kind="press"` on a mocked helper triggers `handlePress`, and `kind="release"` triggers `handleRelease`.

### Touch only if needed

4. `frontend/electron/dictation/types.ts` — if you introduce any new exported type for the orchestrator options.

**Do not touch** — confirmed irrelevant to this task:

- `helpers/MozgoslavDictationHelper/**` — Swift helper already emits press/release correctly (verified in logs: `H1 HotkeyMonitor: press/release`, `DictationHelper: emit hotkey kind=press/release`).
- `backend/src/**` — both backend endpoints (`/api/dictation/push/{id}` JSON and `/api/dictation/{id}/push` raw) already exist and keep serving their respective pipelines.
- `frontend/src/features/Dashboard/**` — Dashboard UI stays as-is for toggle mode.
- `python-sidecar/**` — unrelated (the `ModuleNotFoundError: No module named 'pydantic_settings'` in the launcher is a separate known issue for diarization/NER; does not affect dictation since Whisper.net runs natively in .NET).

## Edit 1 — `frontend/electron/dictation/DictationOrchestrator.ts`

### 1a. Extend `OrchestratorOptions`

Current shape (keep comment-free — no doc-strings):

```ts
export interface OrchestratorOptions {
    readonly helperBinaryPath: string;
    readonly mouseButton: number;
    readonly keyboardFallbackKeycode: number | null;
    readonly sampleRate: number;
    readonly injectMode: "auto" | "cgevent" | "accessibility";
    readonly overlayEnabled: boolean;
}
```

Change to:

```ts
export interface OrchestratorOptions {
    readonly helperBinaryPath: string;
    readonly mouseButton: number | null;
    readonly keyboardFallbackKeycode: number | null;
    readonly keyboardAccelerator: string | null;
    readonly sampleRate: number;
    readonly injectMode: "auto" | "cgevent" | "accessibility";
    readonly overlayEnabled: boolean;
}
```

Semantics:

- `mouseButton !== null` → subscribe to uiohook mouse events for that button.
- `keyboardAccelerator !== null` → ask Swift helper to start monitoring that accelerator, route its press/release events to `handlePress/handleRelease`.
- Both can be null simultaneously (push-to-talk disabled — legacy toggle will handle hotkey in the renderer).
- Both can be set simultaneously — the orchestrator handles either source, and `this.phase !== "idle"` guarding in `handlePress` already prevents double-start.

### 1b. Rewire `initialize`

Current `initialize` (around lines 51-63):

```ts
async initialize(onQuit: () => void): Promise<void> {
    this.tray.build(onQuit);
    this.helper.start();
    this.helper.on("audio", (chunk: AudioChunkPayload) => {
        void this.pushAudioToBackend(chunk);
    });

    this.hotkey.on("hotkey", (event) => {
        if (event.type === "press") void this.handlePress();
        else void this.handleRelease();
    });
    await this.hotkey.start();
}
```

Change to:

```ts
async initialize(onQuit: () => void): Promise<void> {
    this.tray.build(onQuit);
    this.helper.start();
    this.helper.on("audio", (chunk: AudioChunkPayload) => {
        void this.pushAudioToBackend(chunk);
    });
    this.helper.on("hotkey", (payload: HotkeyEventPayload) => {
        if (payload.kind === "press") void this.handlePress();
        else void this.handleRelease();
    });

    if (this.options.mouseButton !== null) {
        this.hotkey.on("hotkey", (event) => {
            if (event.type === "press") void this.handlePress();
            else void this.handleRelease();
        });
        await this.hotkey.start();
    }

    if (this.options.keyboardAccelerator) {
        await this.helper.startHotkey(this.options.keyboardAccelerator);
    }
}
```

Notes:

- `HotkeyEventPayload` is already exported from `./NativeHelperClient`. Import it if it is not imported yet.
- Keep a single subscription to `this.helper.on("hotkey", ...)` — `NativeHelperClient` is an `EventEmitter` and will fire the handler for every Swift-helper event regardless of the accelerator value.

### 1c. Constructor — guard mouse `HotkeyMonitor` creation

Current (around lines 43-49):

```ts
constructor(private readonly options: OrchestratorOptions) {
    this.hotkey = new HotkeyMonitor(options.mouseButton, options.keyboardFallbackKeycode);
    this.helper = new NativeHelperClient(options.helperBinaryPath);
    this.overlay = new OverlayWindow();
    this.tray = new TrayManager();
    this.sound = new PhaseSoundPlayer();
}
```

`HotkeyMonitor` requires `mouseButton: number` today. Allow null on the orchestrator side but fall back to an unreachable sentinel (e.g. `-1`) so the uiohook handlers never match when mouse is disabled, **or** change `HotkeyMonitor` to accept `mouseButton: number | null`. Prefer the second — one-line widening in `frontend/electron/dictation/HotkeyMonitor.ts`:

```ts
constructor(
    private readonly mouseButton: number | null,
    private readonly keyboardFallbackKeycode: number | null
) {
```

and update the two compare sites in `handleMouseDown` / `handleMouseUp` to early-return if `this.mouseButton === null`:

```ts
private handleMouseDown(event: UiohookMouseEvent): void {
    if (this.mouseButton === null) return;
    if (event.button !== this.mouseButton || this.pressed) return;
    // ...
}
```

`HotkeyMonitor.start()` itself can still import uiohook unconditionally — the cost is a native-module load that does nothing, cheap enough. Simpler than gating start.

Orchestrator constructor becomes:

```ts
constructor(private readonly options: OrchestratorOptions) {
    this.hotkey = new HotkeyMonitor(options.mouseButton, options.keyboardFallbackKeycode);
    this.helper = new NativeHelperClient(options.helperBinaryPath);
    this.overlay = new OverlayWindow();
    this.tray = new TrayManager();
    this.sound = new PhaseSoundPlayer();
}
```

No change required here if you went with the `number | null` widening.

### 1d. Keep `startKeyboardHotkey/stopKeyboardHotkey/onKeyboardHotkeyEvent` public API alive

`main.ts` still uses these for the toggle-mode renderer-SSE path. Keep them — they are legitimate for toggle mode. Do not delete.

Preserve their current bodies:

```ts
async startKeyboardHotkey(accelerator: string): Promise<void> {
    await this.helper.startHotkey(accelerator);
}

async stopKeyboardHotkey(): Promise<void> {
    await this.helper.stopHotkey();
}

onKeyboardHotkeyEvent(cb: (payload: HotkeyEventPayload) => void): void {
    this.helper.on("hotkey", cb);
}
```

The orchestrator's own `this.helper.on("hotkey", ...)` added in 1b runs in parallel — both listeners fire on every event, by `EventEmitter` semantics. That is fine: in push-to-talk mode main.ts will not attach `forwardHotkeyToBackend` (see Edit 2). In toggle mode the orchestrator's `mouseButton` and `keyboardAccelerator` will both be `null`, and the `helper.on("hotkey")` handler inside the orchestrator will still fire, but `handlePress` early-returns on `this.phase !== "idle"` plus — critically — `helper.startHotkey` will never be called, so Swift helper will not emit keyboard events at all. The internal subscription is a no-op in toggle.

## Edit 2 — `frontend/electron/main.ts`

### 2a. `initializeDictation` — thread settings through

Current (around lines 413-433):

```ts
const initializeDictation = async (): Promise<void> => {
    try {
        const helperBinaryPath = resolveDictationHelperPath();
        dictationOrchestrator = new DictationOrchestrator({
            helperBinaryPath,
            mouseButton: 5,
            keyboardFallbackKeycode: null,
            sampleRate: 48_000,
            injectMode: "auto",
            overlayEnabled: true,
        });
        await dictationOrchestrator.initialize(() => {
            dictationOrchestrator?.destroy();
            dictationOrchestrator = null;
            app.quit();
        });
    } catch (error) {
        console.error("[dictation] initialization failed:", error);
        dictationOrchestrator = null;
    }
};
```

`initializeDictation` runs before settings are fetched (see `main.ts` app-ready handler: `createWindow()` → `initializeDictation()` → `applyCustomHotkeyFromSettings()`). Keep that order — build orchestrator with a safe default (mouse-5, no keyboard, push-to-talk NOT yet committed) and let `applyCustomHotkeyFromSettings` reconfigure it once settings are readable.

So keep `initializeDictation` essentially as-is, but add the new option:

```ts
const initializeDictation = async (): Promise<void> => {
    try {
        const helperBinaryPath = resolveDictationHelperPath();
        dictationOrchestrator = new DictationOrchestrator({
            helperBinaryPath,
            mouseButton: null,
            keyboardFallbackKeycode: null,
            keyboardAccelerator: null,
            sampleRate: 48_000,
            injectMode: "auto",
            overlayEnabled: true,
        });
        await dictationOrchestrator.initialize(() => {
            dictationOrchestrator?.destroy();
            dictationOrchestrator = null;
            app.quit();
        });
    } catch (error) {
        console.error("[dictation] initialization failed:", error);
        dictationOrchestrator = null;
    }
};
```

Rationale for the change: until settings are fetched, we do not know the desired mode. Start in "quiet" mode (both sources null) and let `applyCustomHotkeyFromSettings` arm the right source explicitly. Previously the orchestrator blindly listened to mouse button 5 even when user had configured keyboard — unsafe.

### 2b. `applyCustomHotkeyFromSettings` — route push-to-talk through orchestrator

Current shape (lines ~315-370) pulls settings, then has three branches:

- `pushToTalk && dictationOrchestrator && custom` → `dictationOrchestrator.onKeyboardHotkeyEvent(forwardHotkeyToBackend)` + `startKeyboardHotkey(custom)`. This is Pipeline B — remove this for push-to-talk, keep for toggle mode.
- `!custom` → default Electron globalShortcut toggle.
- `custom` → custom Electron globalShortcut toggle.

Rewrite so push-to-talk always runs through the orchestrator directly, no backend SSE detour. The settings endpoint already returns `dictationHotkeyType`, `dictationMouseButton`, `dictationKeyboardHotkey`, `dictationPushToTalk` — verify by grepping `DictationHotkeyType` / `DictationMouseButton` (these are on `AppSettingsDto` already — `backend/src/Mozgoslav.Application/Interfaces/AppSettingsDto.cs`).

Shape after fix:

```ts
const applyCustomHotkeyFromSettings = async (): Promise<void> => {
    const maxAttempts = 8;
    const delayMs = 750;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
            const response = await fetch(`${BACKEND_ORIGIN}/api/settings`);
            if (!response.ok) throw new Error(`status ${response.status}`);
            const settings = (await response.json()) as {
                dictationKeyboardHotkey?: string;
                dictationMouseButton?: number;
                dictationHotkeyType?: string;
                dictationPushToTalk?: boolean;
            };
            const custom = settings.dictationKeyboardHotkey?.trim() ?? "";
            const pushToTalk = settings.dictationPushToTalk === true;
            const hotkeyType = settings.dictationHotkeyType ?? "mouse";
            const mouseButton = settings.dictationMouseButton ?? 5;

            console.info("=".repeat(70));
            console.info(
                `[hotkey] CHECKPOINT settings.custom='${custom}' settings.pushToTalk=${pushToTalk} settings.hotkeyType='${hotkeyType}' settings.mouseButton=${mouseButton} orchestratorReady=${dictationOrchestrator !== null}`,
            );

            if (pushToTalk && dictationOrchestrator) {
                unregisterGlobalDictationHotkey();
                console.info("[hotkey]   unregistered Electron globalShortcut");
                try {
                    if (hotkeyType === "keyboard" && custom) {
                        console.info(`[hotkey] PATH -> Swift helper keyboard push-to-talk (cursor injection) accelerator='${custom}'`);
                        await dictationOrchestrator.configurePushToTalk({
                            mouseButton: null,
                            keyboardAccelerator: custom,
                        });
                    } else {
                        console.info(`[hotkey] PATH -> uiohook mouse push-to-talk (cursor injection) button=${mouseButton}`);
                        await dictationOrchestrator.configurePushToTalk({
                            mouseButton,
                            keyboardAccelerator: null,
                        });
                    }
                } catch (err) {
                    console.warn("[hotkey] push-to-talk setup FAILED:", err);
                    console.warn("[hotkey] FALLBACK -> Electron globalShortcut toggle (NO cursor injection)");
                    registerGlobalDictationHotkey(custom || undefined);
                }
                return;
            }

            if (!custom) {
                console.info("[hotkey] PATH -> default Electron globalShortcut (toggle mode, no cursor injection)");
                return;
            }
            console.info("[hotkey] PATH -> custom Electron globalShortcut (toggle mode, no cursor injection)");
            unregisterGlobalDictationHotkey();
            const ok = registerGlobalDictationHotkey(custom);
            if (!ok) {
                console.warn(
                    `[globalShortcut] Failed to register custom accelerator '${custom}'. Falling back to default.`,
                );
                registerGlobalDictationHotkey();
            }
            return;
        } catch (error) {
            if (attempt === maxAttempts - 1) {
                console.warn("[hotkey] settings fetch failed after retries:", error);
                return;
            }
            await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
    }
};
```

Key changes from current code:

- Removed `dictationOrchestrator.onKeyboardHotkeyEvent((payload) => forwardHotkeyToBackend(payload))` — push-to-talk no longer takes the renderer-SSE detour. The orchestrator handles press/release directly.
- Push-to-talk branch now calls new `configurePushToTalk` method on the orchestrator (see Edit 1e below — add it).
- Log lines updated so the source of events is visible at a glance.

### 2c. New method `configurePushToTalk` on `DictationOrchestrator`

Add to `frontend/electron/dictation/DictationOrchestrator.ts`:

```ts
async configurePushToTalk(options: {
    mouseButton: number | null;
    keyboardAccelerator: string | null;
}): Promise<void> {
    if (options.mouseButton !== null) {
        this.hotkey.setMouseButton(options.mouseButton);
        await this.hotkey.start();
    } else {
        this.hotkey.stop();
    }

    if (options.keyboardAccelerator) {
        await this.helper.startHotkey(options.keyboardAccelerator);
    } else {
        await this.helper.stopHotkey();
    }
}
```

This implies `HotkeyMonitor` gains a `setMouseButton(button: number): void` method that updates the internal field. Add to `frontend/electron/dictation/HotkeyMonitor.ts`:

```ts
setMouseButton(button: number | null): void {
    this.mouseButton = button;
}
```

(Drop the `private readonly` on the field — it must be mutable now. Or use a backing mutable field with a getter, whichever reads cleaner.)

Also wire the press/release subscription inside `initialize` only once — the previous code subscribed `this.hotkey.on("hotkey", ...)` unconditionally, keep it unconditional. `setMouseButton(null)` + `stop()` is enough to silence it between mode switches.

## Edit 3 — tests

### 3a. Orchestrator unit test

Create `frontend/electron/__tests__/DictationOrchestrator.test.ts` if the tests directory exists; otherwise add the test file next to the orchestrator per repo convention (check `frontend/CLAUDE.md` for `__tests__/` folder placement).

Minimum test cases:

1. `helper.on("hotkey")` with `kind="press"` triggers `handlePress`: mock `NativeHelperClient`, emit `{kind: "press"}`, expect a `POST /api/dictation/start` was called on the fake `net.request`.
2. `helper.on("hotkey")` with `kind="release"` triggers `handleRelease`: pre-seed `sessionId`, emit `{kind: "release"}`, expect a `POST /api/dictation/stop/{id}` and then a call to `helper.injectText(<polishedText>, "auto")`.
3. `configurePushToTalk({mouseButton: 5, keyboardAccelerator: null})` stops helper keyboard and starts uiohook.
4. `configurePushToTalk({mouseButton: null, keyboardAccelerator: "Right-Option"})` stops uiohook and starts helper keyboard monitor.

Use `jest` with `jest.mock("uiohook-napi")` to sidestep native binding loading in CI. `NativeHelperClient` extends `EventEmitter`, so a plain mock with `emit` works.

### 3b. Backend — no new tests required

`DictationSessionManager` already has contract tests in `backend/tests/Mozgoslav.Tests.Integration/DictationEndpointsTests.cs`. The endpoints `start` / `push` (JSON) / `stop` are unchanged. Verify existing tests still pass: `cd backend && dotnet test -maxcpucount:1`.

## Test plan (manual)

1. `cd frontend && npm run build:helper:mac` (rebuild Swift helper — required for `hotkey.start` JSON-RPC method if you came from a pre-75c38a6 build).
2. Full restart the app via `scripts/demo.command` or `cd frontend && npm run dev` after killing any running Electron process.
3. Open Settings → set **Hotkey type = keyboard**, **Keyboard hotkey = `CommandOrControl+7`** (or any binding you like), **Push-to-talk = on**.
4. Electron console should print:
   - `[hotkey] CHECKPOINT settings.custom='CommandOrControl+7' settings.pushToTalk=true settings.hotkeyType='keyboard' ...`
   - `[hotkey] PATH -> Swift helper keyboard push-to-talk (cursor injection) accelerator='CommandOrControl+7'`
   - helper stderr: `H1 HotkeyMonitor started for accelerator='CommandOrControl+7' accessibilityGranted=true keyDownMonitor=true keyUpMonitor=true`.
5. Put cursor into **TextEdit** (native Cocoa → goes through `.cgEvent` injection path). Press and hold `⌘+7`, say a short phrase in Russian, release.
6. Expected backend log:
   - `Dictation session <id> started (source=global-hotkey)` (not `source=dashboard` — that would mean the old Pipeline B is still in play).
   - `HTTP POST /api/dictation/push/<id>` (JSON samples, id AFTER `push`) — not `/api/dictation/<id>/push` (raw body, ffmpeg).
   - `Dictation session <id> finalized in <ms> ms, <N> chars`.
7. Expected helper stderr: `TextInjectionService: inject strategy=cgEvent len=N` followed by `injected strategy=cgEvent len=N`.
8. Expected result: the phrase appears at the caret position in TextEdit.
9. Flip Settings → **Hotkey type = mouse**, **Mouse button = 5**. Restart not required (`applyCustomHotkeyFromSettings` can re-run; if it does not, add a trigger — out of scope for this task). Press-and-hold mouse button 5, dictate, release — same cursor injection should happen.

## Acceptance criteria

- [ ] Keyboard mode push-to-talk injects text under the cursor in TextEdit.
- [ ] Mouse mode push-to-talk still injects text under the cursor in TextEdit.
- [ ] Backend session `source` is `global-hotkey` (not `dashboard`) in both modes.
- [ ] Audio flows through `POST /api/dictation/push/{id}` (JSON, id after `push`) in both modes.
- [ ] `helper.injectText` is called exactly once per press-release cycle.
- [ ] Toggle mode (`DictationPushToTalk=false`) still works via `globalShortcut` registrations — legacy Dashboard UI dictation not regressed.
- [ ] `npm test` passes (frontend).
- [ ] `dotnet test -maxcpucount:1` passes (backend).
- [ ] `npm run typecheck && npm run lint` pass (frontend).

## Non-goals (do NOT fix in this MR)

- **AX injection path for Electron apps (Cursor, VSCode, Slack, Discord, …).** `helpers/MozgoslavDictationHelper/Sources/MozgoslavDictationHelper/TextInjectionService.swift:134-161` reads `kAXValueAttribute`, appends, writes back — wrong API for caret-position injection. Correct API is `kAXSelectedTextAttribute`. Fixing this is a separate task. In TextEdit (used in the manual test above) the CGEvent path is hit, so this non-goal does not block verification.
- **python-sidecar `pydantic_settings` missing.** Sidecar is used for diarization / NER / gender / emotion — not for dictation. Dictation uses Whisper.net native in .NET backend.
- **VAD tuning / Whisper streaming window tuning.** Current RMS gate at 0.005 in `SileroVadPreprocessor.cs` may drop very quiet speech but did not cause the broken pipeline.
- **Switching modes at runtime without restart.** If `applyCustomHotkeyFromSettings` does not re-run on settings change today, leave that as-is — user can restart the app. Hot-swap is a nice-to-have, separate scope.

## References (read for context, do not edit)

- Commit `75c38a6 feat(dictation): push-to-talk via native helper + SSE bus (NEXT H1)` — introduced the current split between Pipeline A and Pipeline B.
- Commit `cf3bb42 fix(dictation): graceful SSE cancel, helper stderr logs, hotkey path diagnostics, loud accessibility warnings` — added the `[hotkey] PATH -> ...` diagnostics in `main.ts`.
- Commit `7d70c28 fix: Accessibility via parent Electron (TCC inheritance) + backend DI ambiguity` — fixed TCC inheritance for the Swift helper hotkey monitor.
- `frontend/electron/dictation/DictationOrchestrator.ts:133` — the only call to `helper.injectText` in the entire codebase.
- `backend/src/Mozgoslav.Application/Services/DictationSessionManager.cs` — backend state machine, unchanged by this task.
- `backend/src/Mozgoslav.Api/Endpoints/DictationEndpoints.cs:47-204` — endpoint routes, unchanged.
- `helpers/MozgoslavDictationHelper/Sources/MozgoslavDictationHelper/DictationHelper.swift:222-233` — `hotkey.start` / `hotkey.stop` JSON-RPC handlers in the Swift helper.
- `helpers/MozgoslavDictationHelper/Sources/MozgoslavDictationHelper/HotkeyMonitor.swift` — Swift-side `NSEvent.addGlobalMonitorForEvents` subscriber, already emits `press/release` pairs correctly (verified in live logs).

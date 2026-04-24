# native

Swift macOS components built with Swift Package Manager. Today: dictation helper (audio capture + text injection). Other native surfaces live here as they arrive.

## commands

```bash
swift build -c release --package-path MozgoslavDictationHelper
swift test              --package-path MozgoslavDictationHelper
```

## conventions

- IPC with Electron main over newline-delimited JSON-RPC on stdin/stdout. No other transport.
- macOS 13+. Platform-agnostic logic lives in `DictationHelperCore`; the executable shell stays in `MozgoslavDictationHelper`.
- Permissions (microphone / accessibility / input monitoring) are probed via the helper, never requested silently.

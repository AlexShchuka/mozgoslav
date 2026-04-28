# native

Swift macOS components built with Swift Package Manager. Today: dictation helper (audio capture + text injection). Other native surfaces live here as they arrive.

## commands

```bash
swift build -c release --package-path MozgoslavDictationHelper
swift test              --package-path MozgoslavDictationHelper
```

## conventions

- IPC with backend over gRPC on HTTP/2 loopback (port 50051 by default; configurable via `Mozgoslav:NativeHelper:GrpcEndpoint`). Helper binary runs as a subprocess; backend is the gRPC client. Service contract lives in `proto/mozgoslav/native/v1/dictation_helper.proto`.
- macOS 13+. Platform-agnostic logic lives in `DictationHelperCore`; the executable shell stays in `MozgoslavDictationHelper`.
- Permissions (microphone / accessibility / input monitoring) are probed via the helper, never requested silently.

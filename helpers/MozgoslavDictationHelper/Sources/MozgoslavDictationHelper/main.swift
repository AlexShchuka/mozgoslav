import Foundation
import DictationHelperCore

// Entry point for the Mozgoslav dictation helper. The Electron main process
// spawns this binary and talks to it over stdin/stdout using line-delimited
// JSON-RPC messages. One process per user session; the helper exits cleanly
// when stdin closes (Electron quit) or on an explicit "shutdown" request.
//
// Methods exposed:
//   - capture.start {deviceId?, sampleRate}  → start mic capture, emit 16 kHz
//     PCM chunks as "audio" events on stdout.
//   - capture.stop                           → stop mic capture.
//   - inject.text {text, mode}               → inject text into the focused app.
//   - inject.detectTarget                    → returns {bundleId, useAX} for the
//     currently focused app.
//   - shutdown                               → clean exit.
let helper = DictationHelper()
helper.run()

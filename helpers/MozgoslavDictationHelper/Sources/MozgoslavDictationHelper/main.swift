import Foundation
import DictationHelperCore

#if canImport(AppKit) && os(macOS)
import AppKit
#endif

// Entry point for the Mozgoslav dictation helper. The Electron main process
// spawns this binary and talks to it over stdin/stdout using line-delimited
// JSON-RPC messages. One process per user session; the helper exits cleanly
// when stdin closes (Electron quit) or on an explicit "shutdown" request.
//
// IMPORTANT — AppKit run loop
// `NSEvent.addGlobalMonitorForEvents` (used by HotkeyMonitor) and
// `AXIsProcessTrustedWithOptions` (used by PermissionProbe) both require a
// live AppKit run loop on the main thread. A bare CLI tool that just spins
// on `stdin.readLine()` never delivers events to the observer and suppresses
// the Accessibility prompt — observed symptom was "helper spawned, hotkey
// silently dead, no macOS prompt". See Swift Forums thread
// https://forums.swift.org/t/keeping-command-line-tool-alive-and-still-get-mouse-and-keyboard-events/48648
// for the canonical diagnosis.
//
// Fix: drive the JSON-RPC loop on a background dispatch queue and let the
// main thread pump `NSApplication.shared.run()`. `.accessory` activation
// policy keeps the helper out of the Dock/menu bar — the user only sees the
// Electron app itself.
let helper = DictationHelper()

#if canImport(AppKit) && os(macOS)
DispatchQueue.global(qos: .userInitiated).async {
    helper.run()
    // stdin closed → ask the AppKit run loop to tear down so the process
    // can exit cleanly. `terminate(_:)` dispatches back to the main thread.
    DispatchQueue.main.async {
        NSApplication.shared.terminate(nil)
    }
}

let app = NSApplication.shared
app.setActivationPolicy(.accessory)
app.run()
#else
// Non-macOS builds (CI on Linux) have no AppKit and no global event
// monitors to serve — fall back to the blocking stdin loop so the Swift
// package still compiles and the JSON-RPC surface can be unit-tested.
helper.run()
#endif

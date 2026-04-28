import Foundation
import DictationHelperCore

#if canImport(AppKit) && os(macOS)
import AppKit
#endif

let args = CommandLine.arguments
let useGrpc = args.contains("--grpc")

if useGrpc {
    let audioCapture = AudioCaptureService()
    let textInjector = TextInjectionService()
    let focusDetector = FocusedAppDetector()
    let hotkeyMonitor = HotkeyMonitor()
    let dumpHotkeyMonitor = HotkeyMonitor()
    let askCorpusHotkeyMonitor = HotkeyMonitor()

    #if canImport(AppKit) && os(macOS)
    let app = NSApplication.shared
    app.setActivationPolicy(.accessory)
    Task {
        do {
            try await GrpcServer.run(
                audioCapture: audioCapture,
                textInjector: textInjector,
                focusDetector: focusDetector,
                hotkeyMonitor: hotkeyMonitor,
                dumpHotkeyMonitor: dumpHotkeyMonitor,
                askCorpusHotkeyMonitor: askCorpusHotkeyMonitor
            )
        } catch {
            FileLog.shared.info("GrpcServer terminated with error: \(error)")
            DispatchQueue.main.async {
                NSApplication.shared.terminate(nil)
            }
        }
    }
    app.run()
    #else
    Task {
        try await GrpcServer.run(
            audioCapture: audioCapture,
            textInjector: textInjector,
            focusDetector: focusDetector,
            hotkeyMonitor: hotkeyMonitor,
            dumpHotkeyMonitor: dumpHotkeyMonitor,
            askCorpusHotkeyMonitor: askCorpusHotkeyMonitor
        )
    }
    RunLoop.main.run()
    #endif
} else {
    let helper = DictationHelper()
    #if canImport(AppKit) && os(macOS)
    DispatchQueue.global(qos: .userInitiated).async {
        helper.run()
        DispatchQueue.main.async {
            NSApplication.shared.terminate(nil)
        }
    }

    let app = NSApplication.shared
    app.setActivationPolicy(.accessory)
    app.run()
    #else
    helper.run()
    #endif
}

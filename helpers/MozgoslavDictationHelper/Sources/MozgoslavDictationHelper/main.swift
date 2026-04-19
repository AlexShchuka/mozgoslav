import Foundation
import DictationHelperCore

#if canImport(AppKit) && os(macOS)
import AppKit
#endif

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

import Foundation

#if canImport(AVFoundation)
import AVFoundation
#endif

#if canImport(ApplicationServices)
import ApplicationServices
#endif

#if canImport(AppKit) && os(macOS)
import AppKit
#endif

public enum PermissionProbe {
    public static func microphoneStatus() -> String {
        #if canImport(AVFoundation)
        let status = AVCaptureDevice.authorizationStatus(for: .audio)
        switch status {
        case .authorized: return "granted"
        case .denied, .restricted: return "denied"
        case .notDetermined: return "undetermined"
        @unknown default: return "undetermined"
        }
        #else
        return "undetermined"
        #endif
    }

    public static func accessibilityStatus() -> String {
        #if canImport(ApplicationServices)
        return AXIsProcessTrusted() ? "granted" : "undetermined"
        #else
        return "undetermined"
        #endif
    }

    public static func inputMonitoringStatus() -> String {
        #if canImport(ApplicationServices)
        guard let fn = IOHIDCheckAccess else { return "undetermined" }
        let trusted = fn(kIOHIDRequestTypeListenEvent)
        switch trusted {
        case kIOHIDAccessTypeGranted: return "granted"
        case kIOHIDAccessTypeDenied: return "denied"
        case kIOHIDAccessTypeUnknown: return "undetermined"
        default: return "undetermined"
        }
        #else
        return "undetermined"
        #endif
    }

    public static func requestAccessibility() -> Bool {
        #if canImport(ApplicationServices)
        let promptKey = kAXTrustedCheckOptionPrompt.takeUnretainedValue() as String
        let options: CFDictionary = [promptKey: true] as CFDictionary
        return AXIsProcessTrustedWithOptions(options)
        #else
        return false
        #endif
    }

    public static func requestInputMonitoring() -> Bool {
        #if canImport(ApplicationServices)
        guard let fn = IOHIDRequestAccess else { return false }
        return fn(kIOHIDRequestTypeListenEvent)
        #else
        return false
        #endif
    }

    public static func openAccessibilitySettings() {
        #if canImport(AppKit) && os(macOS)
        guard let url = URL(
            string: "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility"
        ) else { return }
        NSWorkspace.shared.open(url)
        #endif
    }

    public static func openInputMonitoringSettings() {
        #if canImport(AppKit) && os(macOS)
        guard let url = URL(
            string: "x-apple.systempreferences:com.apple.preference.security?Privacy_ListenEvent"
        ) else { return }
        NSWorkspace.shared.open(url)
        #endif
    }
}

#if canImport(ApplicationServices)
private typealias IOHIDAccessCheckFn = @convention(c) (Int) -> Int
private typealias IOHIDAccessRequestFn = @convention(c) (Int) -> Bool

private let ioKitHandle: UnsafeMutableRawPointer? = dlopen(
    "/System/Library/Frameworks/IOKit.framework/IOKit",
    RTLD_LAZY
)

private let IOHIDCheckAccess: ((Int) -> Int)? = {
    guard let handle = ioKitHandle, let sym = dlsym(handle, "IOHIDCheckAccess") else {
        return nil
    }
    let fn = unsafeBitCast(sym, to: IOHIDAccessCheckFn.self)
    return { type in fn(type) }
}()

private let IOHIDRequestAccess: ((Int) -> Bool)? = {
    guard let handle = ioKitHandle, let sym = dlsym(handle, "IOHIDRequestAccess") else {
        return nil
    }
    let fn = unsafeBitCast(sym, to: IOHIDAccessRequestFn.self)
    return { type in fn(type) }
}()

private let kIOHIDRequestTypeListenEvent = 1
private let kIOHIDAccessTypeGranted = 0
private let kIOHIDAccessTypeDenied = 1
private let kIOHIDAccessTypeUnknown = 2
#endif

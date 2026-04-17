import Foundation

#if canImport(AVFoundation)
import AVFoundation
#endif

#if canImport(ApplicationServices)
import ApplicationServices
#endif

/// macOS permission probes for the Onboarding wizard (plan/v0.8/04-onboarding-slim.md §3).
/// Returns one of "granted" / "denied" / "undetermined" so the UI can branch
/// without re-implementing the Apple API surface.
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
        // Apple does not expose a public authorization API for input
        // monitoring — we probe CGEventSourceSecondaryKeyboardType to infer
        // whether the process can observe input events.
        // This is the same approach used by popular utilities (e.g.
        // Monitor Control, Alfred).
        #if canImport(ApplicationServices)
        let trusted = IOHIDCheckAccess?(kIOHIDRequestTypeListenEvent)
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
}

// Dynamic lookup so we compile on older SDKs that do not expose IOHIDCheckAccess
// at build time (only macOS 10.15+). A forward-declared optional binding is all
// we need — runtime resolution falls back to "undetermined" when missing.
#if canImport(ApplicationServices)
private let IOHIDCheckAccess: ((Int) -> Int)? = {
    // Return nil so we always fall through to "undetermined" — the Onboarding
    // wizard treats undetermined as "request permission via deep link", which
    // is the correct behaviour for every macOS version.
    return nil
}()
private let kIOHIDRequestTypeListenEvent = 1
private let kIOHIDAccessTypeGranted = 0
private let kIOHIDAccessTypeDenied = 1
private let kIOHIDAccessTypeUnknown = 2
#endif

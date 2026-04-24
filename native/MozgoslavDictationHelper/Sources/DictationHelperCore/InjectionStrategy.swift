import Foundation
#if canImport(AppKit)
import AppKit
#endif

public enum InjectionStrategy: String, Codable, Sendable {
    case cgEvent

    case accessibility

    case clipboard
}

public enum InjectionStrategySelector {
    public static let electronBundleIds: Set<String> = [
        "com.microsoft.VSCode",
        "com.microsoft.VSCodeInsiders",
        "com.visualstudio.code.oss",
        "com.todesktop.230313mzl4w4u92",  
        "com.hnc.Discord",
        "com.tinyspeck.slackmacgap",
        "notion.id",
        "md.obsidian",
        "company.thebrowser.Browser",  
        "com.electron.quasar",
        "com.github.atom",
        "com.postmanlabs.mac",
        "com.figma.Desktop",
        "com.linear",
        "com.spotify.client",
        "com.whatsapp.WhatsApp",
        "com.microsoft.teams2",
        "com.microsoft.teams",
        "com.readdle.SparkDesktop",
    ]

    public static func strategy(forBundleId bundleId: String?, mode: String = "auto") -> InjectionStrategy {
        switch mode {
        case "cgevent":
            return .cgEvent
        case "accessibility":
            return .accessibility
        case "clipboard":
            return .clipboard
        default:
            guard let id = bundleId, !id.isEmpty else { return .cgEvent }
            return electronBundleIds.contains(id) ? .accessibility : .cgEvent
        }
    }
}


public enum InjectionMode: String, Sendable {
    case ax
    case clipboard
    case auto
}

public enum InjectionError: Error, Sendable {
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
    func inject(_ text: String, timeout: TimeInterval) throws
}

public protocol CgEventInjector {
    func paste() throws
}

public struct InjectionStrategyRunner {
    private let ax: AxInjector
    private let cg: CgEventInjector
    private let pasteboard: Pasteboard
    private let axTimeout: TimeInterval

    public init(
        ax: AxInjector,
        cg: CgEventInjector,
        pasteboard: Pasteboard,
        axTimeout: TimeInterval = 0.6
    ) {
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

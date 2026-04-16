// swift-tools-version: 5.9
// Swift package for the Mozgoslav push-to-talk dictation helper.
//
// - `DictationHelperCore` — platform-agnostic logic (injection-strategy selection,
//   Electron-app blocklist, JSON-RPC envelope codec). Unit-tested on any OS that
//   ships a Swift toolchain.
// - `MozgoslavDictationHelper` — executable that wires AVCaptureSession (mic
//   capture at 48 kHz, downsample to 16 kHz PCM), AXUIElement (text injection
//   into Electron apps), and CGEventPost (fast path for native apps). Runs as a
//   child process spawned by the Electron main; talks JSON-RPC over stdin/stdout.
import PackageDescription

let package = Package(
    name: "MozgoslavDictationHelper",
    platforms: [
        .macOS(.v13),
    ],
    products: [
        .executable(name: "mozgoslav-dictation-helper", targets: ["MozgoslavDictationHelper"]),
        .library(name: "DictationHelperCore", targets: ["DictationHelperCore"]),
    ],
    targets: [
        .executableTarget(
            name: "MozgoslavDictationHelper",
            dependencies: ["DictationHelperCore"],
            path: "Sources/MozgoslavDictationHelper"
        ),
        .target(
            name: "DictationHelperCore",
            path: "Sources/DictationHelperCore"
        ),
        .testTarget(
            name: "DictationHelperCoreTests",
            dependencies: ["DictationHelperCore"],
            path: "Tests/DictationHelperCoreTests"
        ),
    ]
)

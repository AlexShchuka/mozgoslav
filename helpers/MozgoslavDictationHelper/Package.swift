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

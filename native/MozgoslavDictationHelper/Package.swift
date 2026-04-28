// swift-tools-version: 6.0

import PackageDescription

let package = Package(
    name: "MozgoslavDictationHelper",
    platforms: [
        .macOS(.v14),
    ],
    products: [
        .executable(name: "mozgoslav-dictation-helper", targets: ["MozgoslavDictationHelper"]),
        .library(name: "DictationHelperCore", targets: ["DictationHelperCore"]),
    ],
    dependencies: [
        .package(
            url: "https://github.com/grpc/grpc-swift-2",
            "2.0.0"..<"2.5.0"),
        .package(
            url: "https://github.com/grpc/grpc-swift-nio-transport",
            "2.0.0"..<"2.5.0"),
        .package(
            url: "https://github.com/grpc/grpc-swift-protobuf",
            "2.0.0"..<"2.5.0"),
        .package(
            url: "https://github.com/apple/swift-protobuf",
            from: "1.28.0"),
    ],
    targets: [
        .executableTarget(
            name: "MozgoslavDictationHelper",
            dependencies: [
                "DictationHelperCore",
                .product(name: "GRPCCore", package: "grpc-swift-2"),
                .product(name: "GRPCNIOTransportHTTP2", package: "grpc-swift-nio-transport"),
                .product(name: "GRPCProtobuf", package: "grpc-swift-protobuf"),
                .product(name: "SwiftProtobuf", package: "swift-protobuf"),
            ],
            path: "Sources/MozgoslavDictationHelper"
        ),
        .target(
            name: "DictationHelperCore",
            dependencies: [],
            path: "Sources/DictationHelperCore"
        ),
        .testTarget(
            name: "DictationHelperCoreTests",
            dependencies: ["DictationHelperCore"],
            path: "Tests/DictationHelperCoreTests"
        ),
        .testTarget(
            name: "MozgoslavDictationHelperTests",
            dependencies: [
                "MozgoslavDictationHelper",
                .product(name: "GRPCCore", package: "grpc-swift-2"),
                .product(name: "GRPCProtobuf", package: "grpc-swift-protobuf"),
            ],
            path: "Tests/MozgoslavDictationHelperTests"
        ),
    ]
)

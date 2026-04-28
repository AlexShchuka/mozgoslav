/** @type {import('jest').Config} */
module.exports = {
    preset: "ts-jest",
    testEnvironment: "jsdom",
    roots: ["<rootDir>/src", "<rootDir>/__tests__"],
    setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
    testMatch: [
        "<rootDir>/__tests__/**/*.test.(ts|tsx)",
        "<rootDir>/src/**/*.test.(ts|tsx)",
    ],
    moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/src/$1",
        "\\.(css|less|scss|sass)$": "identity-obj-proxy",
        "^react-markdown$": "<rootDir>/src/testUtils/reactMarkdownStub.tsx",
        "^remark-gfm$": "<rootDir>/src/testUtils/remarkGfmStub.ts",
    },
    transform: {
        "^.+\\.(ts|tsx)$": [
            "ts-jest",
            {
                tsconfig: {
                    jsx: "react-jsx",
                    esModuleInterop: true,
                    module: "commonjs",
                    moduleResolution: "node",
                    ignoreDeprecations: "6.0",
                },
            },
        ],
    },
    moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
    testPathIgnorePatterns: ["/node_modules/", "/dist/", "/dist-electron/", "/release/", "/\\.archive/"],
    collectCoverageFrom: [
        "src/**/*.{ts,tsx}",
        "!src/**/*.d.ts",
        "!src/**/__tests__/**",
        "!src/testUtils/**",
        "!src/main.tsx",
        "!src/i18n/**",
    ],
    coverageReporters: ["text-summary", "lcov", "json-summary"],
    coverageDirectory: "coverage",
    coverageThreshold: {
        global: {
            lines: 70,
            statements: 70,
            branches: 50,
            functions: 62,
        },
    },
};

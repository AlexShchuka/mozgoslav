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
    // react-markdown + remark-gfm ship ESM-only builds that ts-jest cannot parse
    // in CommonJS mode. The NoteViewer tests only care about the rendered text
    // content — map both packages to lightweight CJS stubs that pass children
    // through as plain divs.
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
        },
      },
    ],
  },
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
  testPathIgnorePatterns: ["/node_modules/", "/dist/", "/dist-electron/", "/release/"],
};

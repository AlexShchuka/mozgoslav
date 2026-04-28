const js = require("@eslint/js");
const tsParser = require("@typescript-eslint/parser");
const tsPlugin = require("@typescript-eslint/eslint-plugin");
const reactPlugin = require("eslint-plugin-react");
const reactHooksPlugin = require("eslint-plugin-react-hooks");

const nodeGlobals = {
    require: "readonly",
    module: "readonly",
    exports: "readonly",
    process: "readonly",
    console: "readonly",
    Buffer: "readonly",
    __dirname: "readonly",
    __filename: "readonly",
    global: "readonly",
};

module.exports = [
    {
        ignores: ["dist/**", "dist-electron/**", "release/**", "node_modules/**", "**/*.d.ts"],
    },
    js.configs.recommended,
    {
        files: ["**/*.{js,cjs}"],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: "commonjs",
            globals: nodeGlobals,
        },
    },
    {
        files: ["**/*.mjs"],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: "module",
            globals: nodeGlobals,
        },
    },
    {
        files: ["**/*.{ts,tsx}"],
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                ecmaVersion: 2022,
                sourceType: "module",
                ecmaFeatures: {jsx: true},
            },
            globals: {
                window: "readonly",
                document: "readonly",
                navigator: "readonly",
                console: "readonly",
                process: "readonly",
                setTimeout: "readonly",
                clearTimeout: "readonly",
                setInterval: "readonly",
                clearInterval: "readonly",
                queueMicrotask: "readonly",
                fetch: "readonly",
                URL: "readonly",
                URLSearchParams: "readonly",
                FormData: "readonly",
                File: "readonly",
                Blob: "readonly",
                HTMLElement: "readonly",
                HTMLDivElement: "readonly",
                HTMLInputElement: "readonly",
                HTMLButtonElement: "readonly",
                HTMLTextAreaElement: "readonly",
                HTMLFormElement: "readonly",
                HTMLSelectElement: "readonly",
                EventSource: "readonly",
                AbortController: "readonly",
                Event: "readonly",
                KeyboardEvent: "readonly",
                MouseEvent: "readonly",
                Buffer: "readonly",
                __dirname: "readonly",
                __filename: "readonly",
                module: "readonly",
                require: "readonly",
                global: "readonly",
                jest: "readonly",
                describe: "readonly",
                it: "readonly",
                test: "readonly",
                expect: "readonly",
                beforeEach: "readonly",
                afterEach: "readonly",
                beforeAll: "readonly",
                afterAll: "readonly",
                NodeJS: "readonly",
            },
        },
        plugins: {
            "@typescript-eslint": tsPlugin,
            react: reactPlugin,
            "react-hooks": reactHooksPlugin,
        },
        settings: {
            react: {version: "detect"},
        },
        rules: {
            ...tsPlugin.configs.recommended.rules,
            ...reactPlugin.configs.recommended.rules,
            ...reactHooksPlugin.configs.recommended.rules,
            "react/react-in-jsx-scope": "off",
            "react/prop-types": "off",
            "@typescript-eslint/no-explicit-any": "warn",
            "@typescript-eslint/no-unused-vars": ["warn", {argsIgnorePattern: "^_", varsIgnorePattern: "^_", destructuredArrayIgnorePattern: "^_"}],
            "@typescript-eslint/no-empty-object-type": ["error", {allowInterfaces: "with-single-extends"}],
            "no-empty": ["error", {allowEmptyCatch: true}],
            "no-unused-vars": "off",
            "no-undef": "off",
        },
    },
    {
        files: ["src/features/**/*.{ts,tsx}", "src/components/**/*.{ts,tsx}", "src/hooks/**/*.{ts,tsx}"],
        rules: {
            "no-restricted-imports": ["error", {
                patterns: [{
                    group: [
                        "*/api/ApiFactory",
                        "*/api/BaseApi",
                        "*/api/ObsidianApi",
                        "../api/ApiFactory",
                        "../../api/ApiFactory",
                        "../api/BaseApi",
                        "../../api/BaseApi",
                        "../api/ObsidianApi",
                        "../../api/ObsidianApi",
                        "../../../api/ApiFactory",
                        "../../../api/BaseApi",
                        "../../../api/ObsidianApi",
                    ],
                    message: "REST API clients (ApiFactory, BaseApi, ObsidianApi) are dead — use GraphQL via saga. Import domain types from 'src/domain/'.",
                }],
            }],
        },
    },
    {
        files: ["**/__tests__/**/*.{ts,tsx}", "**/*.test.{ts,tsx}"],
        rules: {
            "@typescript-eslint/no-require-imports": "off",
        },
    },
];

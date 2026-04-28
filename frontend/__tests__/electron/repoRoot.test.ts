import path from "node:path";
import { resolveRepoRoot, type RepoRootFs } from "../../electron/utils/repoRoot";

interface VirtualEntry {
    readonly kind: "file" | "dir";
    readonly content?: string;
}

const buildFs = (entries: Record<string, VirtualEntry>): RepoRootFs => ({
    fileExists: (filePath: string): boolean => {
        const entry = entries[path.resolve(filePath)];
        return entry?.kind === "file";
    },
    directoryExists: (dirPath: string): boolean => {
        const entry = entries[path.resolve(dirPath)];
        return entry?.kind === "dir";
    },
    readFile: (filePath: string): string => {
        const entry = entries[path.resolve(filePath)];
        if (!entry || entry.kind !== "file" || entry.content === undefined) {
            throw new Error(`Virtual file missing or not a file: ${filePath}`);
        }
        return entry.content;
    },
});

const REPO = path.resolve("/virtual/mozgoslav");
const FRONTEND_PKG = path.join(REPO, "frontend", "package.json");
const PY_SIDECAR = path.join(REPO, "python-sidecar");
const ELECTRON_DIRNAME = path.join(REPO, "frontend", "electron");

const validRepoEntries = (): Record<string, VirtualEntry> => ({
    [REPO]: { kind: "dir" },
    [path.join(REPO, "frontend")]: { kind: "dir" },
    [PY_SIDECAR]: { kind: "dir" },
    [FRONTEND_PKG]: {
        kind: "file",
        content: JSON.stringify({ name: "mozgoslav", version: "0.1.0" }),
    },
    [ELECTRON_DIRNAME]: { kind: "dir" },
});

describe("resolveRepoRoot", () => {
    it("returns the env override when MOZGOSLAV_REPO_ROOT points to an existing directory", () => {
        const overrideDir = path.resolve("/virtual/override-root");
        const fs = buildFs({
            [overrideDir]: { kind: "dir" },
        });

        const result = resolveRepoRoot({
            dirname: "/somewhere/unrelated",
            cwd: "/elsewhere",
            env: { MOZGOSLAV_REPO_ROOT: overrideDir },
            fs,
        });

        expect(result).toBe(overrideDir);
    });

    it("falls through env override when the path does not exist on disk", () => {
        const fs = buildFs(validRepoEntries());

        const result = resolveRepoRoot({
            dirname: ELECTRON_DIRNAME,
            cwd: "/elsewhere",
            env: { MOZGOSLAV_REPO_ROOT: "/virtual/does-not-exist" },
            fs,
        });

        expect(result).toBe(REPO);
    });

    it("walks up from dirname and finds the repo root via package.json + python-sidecar sentinel", () => {
        const fs = buildFs(validRepoEntries());

        const result = resolveRepoRoot({
            dirname: ELECTRON_DIRNAME,
            cwd: "/totally/unrelated",
            env: {},
            fs,
        });

        expect(result).toBe(REPO);
    });

    it("falls back to walking up from cwd when dirname does not contain the repo", () => {
        const fs = buildFs(validRepoEntries());

        const result = resolveRepoRoot({
            dirname: "/no/match/here",
            cwd: path.join(REPO, "frontend"),
            env: {},
            fs,
        });

        expect(result).toBe(REPO);
    });

    it("returns null when neither dirname nor cwd reach a directory matching the sentinel", () => {
        const fs = buildFs({
            "/lonely": { kind: "dir" },
        });

        const result = resolveRepoRoot({
            dirname: "/lonely",
            cwd: "/lonely",
            env: {},
            fs,
        });

        expect(result).toBeNull();
    });

    it("rejects an ancestor that has frontend/package.json but no python-sidecar sibling", () => {
        const repo = path.resolve("/virtual/bad-repo");
        const fs = buildFs({
            [repo]: { kind: "dir" },
            [path.join(repo, "frontend")]: { kind: "dir" },
            [path.join(repo, "frontend", "package.json")]: {
                kind: "file",
                content: JSON.stringify({ name: "mozgoslav" }),
            },
        });

        const result = resolveRepoRoot({
            dirname: path.join(repo, "frontend", "electron"),
            cwd: path.join(repo, "frontend"),
            env: {},
            fs,
        });

        expect(result).toBeNull();
    });

    it("rejects an ancestor whose frontend/package.json has the wrong name", () => {
        const repo = path.resolve("/virtual/wrong-name");
        const fs = buildFs({
            [repo]: { kind: "dir" },
            [path.join(repo, "frontend")]: { kind: "dir" },
            [path.join(repo, "python-sidecar")]: { kind: "dir" },
            [path.join(repo, "frontend", "package.json")]: {
                kind: "file",
                content: JSON.stringify({ name: "some-other-app" }),
            },
        });

        const result = resolveRepoRoot({
            dirname: path.join(repo, "frontend", "electron"),
            cwd: repo,
            env: {},
            fs,
        });

        expect(result).toBeNull();
    });

    it("rejects an ancestor whose frontend/package.json is malformed JSON", () => {
        const repo = path.resolve("/virtual/bad-json");
        const fs = buildFs({
            [repo]: { kind: "dir" },
            [path.join(repo, "frontend")]: { kind: "dir" },
            [path.join(repo, "python-sidecar")]: { kind: "dir" },
            [path.join(repo, "frontend", "package.json")]: {
                kind: "file",
                content: "{ this is not valid json",
            },
        });

        const result = resolveRepoRoot({
            dirname: path.join(repo, "frontend", "electron"),
            cwd: repo,
            env: {},
            fs,
        });

        expect(result).toBeNull();
    });
});

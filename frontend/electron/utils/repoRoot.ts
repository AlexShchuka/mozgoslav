import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const FRONTEND_DIRNAME = "frontend";
const FRONTEND_PACKAGE_NAME = "mozgoslav";
const FRONTEND_PACKAGE_FILE = "package.json";
const PYTHON_SIDECAR_DIRNAME = "python-sidecar";
const ENV_OVERRIDE_KEY = "MOZGOSLAV_REPO_ROOT";

export interface RepoRootFs {
  readonly fileExists: (filePath: string) => boolean;
  readonly directoryExists: (dirPath: string) => boolean;
  readonly readFile: (filePath: string) => string;
}

const defaultFs: RepoRootFs = {
  fileExists: (filePath: string) => existsSync(filePath),
  directoryExists: (dirPath: string) => existsSync(dirPath),
  readFile: (filePath: string) => readFileSync(filePath, "utf8"),
};

export interface RepoRootInputs {
  readonly dirname: string;
  readonly cwd: string;
  readonly env: NodeJS.ProcessEnv;
  readonly fs?: RepoRootFs;
}

const isCandidateRepoRoot = (candidate: string, fs: RepoRootFs): boolean => {
  const pythonSidecarDir = path.join(candidate, PYTHON_SIDECAR_DIRNAME);
  if (!fs.directoryExists(pythonSidecarDir)) {
    return false;
  }
  const packageJsonPath = path.join(candidate, FRONTEND_DIRNAME, FRONTEND_PACKAGE_FILE);
  if (!fs.fileExists(packageJsonPath)) {
    return false;
  }
  let parsed: { name?: unknown };
  try {
    parsed = JSON.parse(fs.readFile(packageJsonPath)) as { name?: unknown };
  } catch {
    return false;
  }
  return parsed.name === FRONTEND_PACKAGE_NAME;
};

const walkUp = (start: string): string[] => {
  const ancestors: string[] = [];
  let current = path.resolve(start);
  let previous = "";
  while (current !== previous) {
    ancestors.push(current);
    previous = current;
    current = path.dirname(current);
  }
  return ancestors;
};

export const resolveRepoRoot = (inputs: RepoRootInputs): string | null => {
  const fs = inputs.fs ?? defaultFs;

  const override = inputs.env[ENV_OVERRIDE_KEY];
  if (override && fs.directoryExists(override)) {
    return path.resolve(override);
  }

  const seen = new Set<string>();
  const seeds = [inputs.dirname, inputs.cwd].filter((seed) => seed && seed.length > 0);

  for (const seed of seeds) {
    for (const candidate of walkUp(seed)) {
      if (seen.has(candidate)) {
        continue;
      }
      seen.add(candidate);
      if (isCandidateRepoRoot(candidate, fs)) {
        return candidate;
      }
    }
  }

  return null;
};

export const REPO_ROOT_ENV_VAR = ENV_OVERRIDE_KEY;

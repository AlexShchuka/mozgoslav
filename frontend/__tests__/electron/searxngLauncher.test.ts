import { EventEmitter } from "node:events";

jest.mock("node:child_process", () => ({
  spawn: jest.fn(),
}));
jest.mock("node:fs", () => ({
  existsSync: jest.fn(),
}));
jest.mock("node:http", () => ({
  get: jest.fn((_url: string, cb: (res: { statusCode: number; resume: () => void }) => void) => {
    const req = new EventEmitter() as EventEmitter & {
      setTimeout: jest.Mock;
      destroy: jest.Mock;
    };
    req.setTimeout = jest.fn();
    req.destroy = jest.fn();
    setTimeout(() => cb({ statusCode: 200, resume: jest.fn() }), 0);
    return req;
  }),
}));

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";

const mockSpawn = spawn as jest.Mock;
const mockExistsSync = existsSync as jest.Mock;

function makeMockProcess() {
  const proc = new EventEmitter() as EventEmitter & {
    stdout: EventEmitter;
    stderr: EventEmitter;
    killed: boolean;
    exitCode: number | null;
    kill: jest.Mock;
    pid: number;
  };
  proc.stdout = new EventEmitter();
  proc.stderr = new EventEmitter();
  proc.killed = false;
  proc.exitCode = null;
  proc.kill = jest.fn((signal?: string) => {
    proc.killed = true;
    proc.exitCode = signal === "SIGKILL" ? 137 : 0;
    proc.emit("exit", proc.exitCode, signal ?? null);
    return true;
  });
  proc.pid = 12345;
  return proc;
}

describe("searxngLauncher", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it("restartSearxng is a no-op when tryStartSearxng was never called", async () => {
    const { restartSearxng } = await import("../../electron/utils/searxngLauncher");
    mockSpawn.mockReturnValue(makeMockProcess());
    mockExistsSync.mockReturnValue(false);

    await expect(restartSearxng()).resolves.toBeUndefined();
    expect(mockSpawn).not.toHaveBeenCalled();
  });

  it("restartSearxng stops then restarts the process", async () => {
    const proc = makeMockProcess();
    mockSpawn.mockReturnValue(proc);
    mockExistsSync.mockReturnValue(true);

    const { tryStartSearxng, stopSearxng, restartSearxng } = await import(
      "../../electron/utils/searxngLauncher"
    );

    await tryStartSearxng({ userDataDir: "/tmp/test-data" });
    expect(mockSpawn).toHaveBeenCalledTimes(1);

    const proc2 = makeMockProcess();
    mockSpawn.mockReturnValue(proc2);

    await restartSearxng();

    expect(proc.kill).toHaveBeenCalled();
    expect(mockSpawn).toHaveBeenCalledTimes(2);

    await stopSearxng();
  });
});

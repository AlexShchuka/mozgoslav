import { existsSync } from "node:fs";
import path from "node:path";
import { resolveRepoRoot } from "../../electron/utils/repoRoot";
import { ServiceSupervisor, type ServiceSpec } from "../../electron/utils/serviceSupervisor";

const makeSpec = (overrides: Partial<ServiceSpec> = {}): ServiceSpec => ({
  name: "test-service",
  startFn: jest.fn().mockResolvedValue(undefined),
  stopFn: jest.fn().mockResolvedValue(undefined),
  restartPolicy: "never",
  ...overrides,
});

describe("ServiceSupervisor", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it("calls startFn for each registered service on startAll", async () => {
    const supervisor = new ServiceSupervisor();
    const specA = makeSpec({ name: "service-a" });
    const specB = makeSpec({ name: "service-b" });
    supervisor.register(specA);
    supervisor.register(specB);

    await supervisor.startAll();

    expect(specA.startFn).toHaveBeenCalledTimes(1);
    expect(specB.startFn).toHaveBeenCalledTimes(1);
  });

  it("calls stopFn for all services on stopAll in reverse order", async () => {
    const supervisor = new ServiceSupervisor();
    const callOrder: string[] = [];
    const specA = makeSpec({
      name: "service-a",
      stopFn: jest.fn().mockImplementation(async () => {
        callOrder.push("a");
      }),
    });
    const specB = makeSpec({
      name: "service-b",
      stopFn: jest.fn().mockImplementation(async () => {
        callOrder.push("b");
      }),
    });
    supervisor.register(specA);
    supervisor.register(specB);

    await supervisor.startAll();
    await supervisor.stopAll();

    expect(callOrder).toEqual(["b", "a"]);
  });

  it("does not restart a service when restartPolicy is never", async () => {
    const supervisor = new ServiceSupervisor();
    const healthCheck = jest.fn().mockResolvedValue(false);
    const spec = makeSpec({
      name: "never-restart",
      healthCheck,
      healthIntervalMs: 1000,
      restartPolicy: "never",
    });
    supervisor.register(spec);
    await supervisor.startAll();

    jest.advanceTimersByTime(2500);
    await Promise.resolve();
    await Promise.resolve();

    expect(spec.startFn).toHaveBeenCalledTimes(1);
  });

  it("restarts a service when policy is on-failure and health check fails", async () => {
    const supervisor = new ServiceSupervisor();
    const healthCheck = jest.fn().mockResolvedValue(false);
    const spec = makeSpec({
      name: "crash-restart",
      healthCheck,
      healthIntervalMs: 500,
      restartPolicy: "on-failure",
      maxRestarts: 2,
    });
    supervisor.register(spec);
    await supervisor.startAll();

    jest.advanceTimersByTime(600);
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(spec.stopFn).toHaveBeenCalled();
  });

  it("stops restarting after maxRestarts exceeded", async () => {
    const supervisor = new ServiceSupervisor();
    const healthCheck = jest.fn().mockResolvedValue(false);
    const spec = makeSpec({
      name: "max-restarts",
      healthCheck,
      healthIntervalMs: 100,
      restartPolicy: "on-failure",
      maxRestarts: 1,
    });
    supervisor.register(spec);
    await supervisor.startAll();

    jest.advanceTimersByTime(1200);
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    const callsToStart = (spec.startFn as jest.Mock).mock.calls.length;
    expect(callsToStart).toBeLessThanOrEqual(3);
  });

  it("resolves dev-mode python-sidecar launch path via MOZGOSLAV_REPO_ROOT override", () => {
    const repoRoot = path.resolve(__dirname, "..", "..", "..");
    const expectedLaunchScript = path.join(repoRoot, "python-sidecar", "launch.sh");
    expect(existsSync(expectedLaunchScript)).toBe(true);

    const resolved = resolveRepoRoot({
      dirname: "/tmp/cannot-find-repo-here",
      cwd: "/tmp/cannot-find-repo-here",
      env: { MOZGOSLAV_REPO_ROOT: repoRoot },
    });

    expect(resolved).toBe(repoRoot);
    expect(path.join(resolved!, "python-sidecar", "launch.sh")).toBe(expectedLaunchScript);
  });

  it("does not call startFn after stopAll", async () => {
    const supervisor = new ServiceSupervisor();
    const healthCheck = jest.fn().mockResolvedValue(false);
    const spec = makeSpec({
      name: "stopped-no-restart",
      healthCheck,
      healthIntervalMs: 200,
      restartPolicy: "on-failure",
      maxRestarts: 5,
    });
    supervisor.register(spec);
    await supervisor.startAll();
    await supervisor.stopAll();

    const callsBefore = (spec.startFn as jest.Mock).mock.calls.length;
    jest.advanceTimersByTime(1000);
    await Promise.resolve();
    await Promise.resolve();

    expect((spec.startFn as jest.Mock).mock.calls.length).toBe(callsBefore);
  });
});

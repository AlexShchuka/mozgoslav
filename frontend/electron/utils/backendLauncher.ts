import {type ChildProcess, spawn} from "node:child_process";
import {existsSync} from "node:fs";
import path from "node:path";

const BACKEND_BINARY_NAME = "Mozgoslav.Api";

let backendProcess: ChildProcess | null = null;

export interface BackendStartOptions {
    /** Extra CLI args forwarded to the backend (e.g., ``--Mozgoslav:SyncthingBaseUrl=...``). */
    readonly extraArgs?: readonly string[];
    /**
     * Extra environment variables forwarded to the backend. Used to communicate
     * the Electron internal loopback port (`Mozgoslav__AudioRecorder__ElectronBridgePort`,
     * consumed via `IConfiguration`) to `AVFoundationAudioRecorder`.
     */
    readonly extraEnv?: Readonly<Record<string, string>>;
}

/**
 * Attempts to spawn the bundled C# backend from the given userData directory.
 * If the binary is not present (e.g., during early development) — logs and
 * silently returns; the renderer will fall back to http://localhost:5050 that
 * the developer starts manually via `dotnet run`.
 */
export const tryStartBackend = async (
    userDataDir: string,
    options: BackendStartOptions = {}
): Promise<void> => {
    const candidatePaths = [
        path.join(userDataDir, "backend", BACKEND_BINARY_NAME),
        path.join(userDataDir, "backend", `${BACKEND_BINARY_NAME}.exe`),
    ];

    const binaryPath = candidatePaths.find((p) => existsSync(p));

    if (!binaryPath) {
        console.info(
            "[backendLauncher] Bundled backend binary not found. " +
            "Assuming developer is running `dotnet run` manually on http://localhost:5050."
        );
        return;
    }

    try {
        backendProcess = spawn(binaryPath, [...(options.extraArgs ?? [])], {
            cwd: path.dirname(binaryPath),
            stdio: ["ignore", "pipe", "pipe"],
            env: {...process.env, ...(options.extraEnv ?? {})},
        });

        backendProcess.stdout?.on("data", (chunk: Buffer) => {
            console.info(`[backend] ${chunk.toString().trimEnd()}`);
        });

        backendProcess.stderr?.on("data", (chunk: Buffer) => {
            console.error(`[backend:err] ${chunk.toString().trimEnd()}`);
        });

        backendProcess.on("exit", (code, signal) => {
            console.info(`[backendLauncher] Backend exited (code=${code}, signal=${signal})`);
            backendProcess = null;
        });

        backendProcess.on("error", (err) => {
            console.error("[backendLauncher] Failed to start backend:", err);
            backendProcess = null;
        });
    } catch (err) {
        console.error("[backendLauncher] Unexpected error starting backend:", err);
    }
};

const BACKEND_STOP_GRACE_MS = 5000;

export const stopBackend = async (graceMs: number = BACKEND_STOP_GRACE_MS): Promise<void> => {
    const proc = backendProcess;
    backendProcess = null;
    if (!proc || proc.killed || proc.exitCode !== null) {
        return;
    }

    const exited = new Promise<void>((resolve) => {
        proc.once("exit", () => resolve());
    });

    try {
        proc.kill("SIGTERM");
    } catch (err) {
        console.error("[backendLauncher] Error sending SIGTERM:", err);
    }

    const timeout = new Promise<void>((resolve) => setTimeout(resolve, graceMs));
    await Promise.race([exited, timeout]);

    if (proc.exitCode === null && !proc.killed) {
        console.warn(`[backendLauncher] Backend did not exit in ${graceMs}ms — sending SIGKILL`);
        try {
            proc.kill("SIGKILL");
        } catch (err) {
            console.error("[backendLauncher] Error sending SIGKILL:", err);
        }
        await Promise.race([exited, new Promise<void>((r) => setTimeout(r, 1000))]);
    }
};

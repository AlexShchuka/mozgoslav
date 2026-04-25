import { type ChildProcess, spawn } from "node:child_process";
import { EventEmitter } from "node:events";
import { randomUUID } from "node:crypto";

import type { AudioChunkPayload, FocusedTarget } from "./types";

export class NativeHelperClient extends EventEmitter {
  private process: ChildProcess | null = null;
  private buffer = "";
  private pending = new Map<
    string,
    { resolve: (value: unknown) => void; reject: (error: Error) => void }
  >();

  constructor(private readonly binaryPath: string) {
    super();
  }

  start(): void {
    if (this.process) return;

    const child = spawn(this.binaryPath, [], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    this.process = child;

    console.info(`[dictation:helper] spawned: ${this.binaryPath} pid=${child.pid ?? "n/a"}`);

    child.stdout?.on("data", (chunk: Buffer) => this.handleStdout(chunk));

    child.stderr?.on("data", (chunk: Buffer) => {
      console.error(`[dictation:helper:err] ${chunk.toString().trimEnd()}`);
    });

    child.stdin?.on("error", (error) => {
      console.error("[dictation:helper:stdin] error:", error);
    });

    child.on("error", (error) => {
      console.error("[dictation:helper] process error:", error);
      this.process = null;
      this.rejectAllPending(error instanceof Error ? error : new Error(String(error)));
    });

    child.on("exit", (code, signal) => {
      console.info(`[dictation:helper] exited code=${code} signal=${signal}`);
      this.process = null;
      this.rejectAllPending(new Error(`helper exited (code=${code}, signal=${signal})`));
    });
  }

  stop(): void {
    if (!this.process) return;
    try {
      this.send("shutdown", undefined).catch(() => undefined);
      this.process.kill();
    } catch (error) {
      console.error("[dictation:helper] kill failed:", error);
    }
    this.process = null;
  }

  async captureStart(sampleRate: number, deviceId?: string): Promise<void> {
    await this.send<object>("capture.start", { deviceId, sampleRate });
  }

  async captureStop(): Promise<void> {
    await this.send<object>("capture.stop", undefined);
  }

  async startFileCapture(
    outputPath: string,
    sessionId: string,
    options?: { streamSessionId?: string; backendBaseUrl?: string }
  ): Promise<void> {
    const params: Record<string, unknown> = {
      outputPath,
      sessionId,
      sampleRate: 16000,
      channels: 1,
      format: "wav",
    };
    if (options?.streamSessionId) params.streamSessionId = options.streamSessionId;
    if (options?.backendBaseUrl) params.backendBaseUrl = options.backendBaseUrl;
    await this.send<object>("capture.startFile", params);
  }

  async stopFileCapture(sessionId: string): Promise<{ path: string; durationMs: number }> {
    const result = (await this.send<{ path: string; durationMs: number }>("capture.stopFile", {
      sessionId,
    })) ?? { path: "", durationMs: 0 };
    return result;
  }

  async checkPermissions(): Promise<{
    microphone: "granted" | "denied" | "undetermined";
    accessibility: "granted" | "denied" | "undetermined";
    inputMonitoring: "granted" | "denied" | "undetermined";
  }> {
    const result =
      (await this.send<{
        microphone?: string;
        accessibility?: string;
        inputMonitoring?: string;
      }>("permission.check", undefined)) ?? {};
    return {
      microphone: normalizePermission(result.microphone),
      accessibility: normalizePermission(result.accessibility),
      inputMonitoring: normalizePermission(result.inputMonitoring),
    };
  }

  async injectText(text: string, mode: "auto" | "cgevent" | "accessibility"): Promise<void> {
    await this.send<object>("inject.text", { text, mode });
  }

  async startHotkey(accelerator: string): Promise<void> {
    await this.send<object>("hotkey.start", { accelerator });
  }

  async stopHotkey(): Promise<void> {
    await this.send<object>("hotkey.stop", undefined);
  }

  async startDumpHotkey(accelerator: string): Promise<void> {
    await this.send<object>("dumpHotkey.start", { accelerator });
  }

  async stopDumpHotkey(): Promise<void> {
    await this.send<object>("dumpHotkey.stop", undefined);
  }

  async detectTarget(): Promise<FocusedTarget> {
    const result = (await this.send<FocusedTarget>("inject.detectTarget", undefined)) as
      | { bundleId?: string; appName?: string; useAX?: boolean }
      | undefined;
    return {
      bundleId: result?.bundleId ?? "",
      appName: result?.appName ?? "",
      useAX: Boolean(result?.useAX),
    };
  }

  private send<T>(method: string, params: unknown): Promise<T | undefined> {
    const child = this.process;

    if (!child) {
      return Promise.reject(new Error("helper process not running"));
    }

    const stdin = child.stdin;
    if (!stdin || stdin.destroyed || !stdin.writable) {
      return Promise.reject(new Error("helper stdin is not writable"));
    }

    const id = randomUUID();
    const payload = JSON.stringify({ id, method, params });

    return new Promise<T | undefined>((resolve, reject) => {
      this.pending.set(id, {
        resolve: (value) => resolve(value as T | undefined),
        reject,
      });

      stdin.write(`${payload}\n`, (error) => {
        if (error) {
          this.pending.delete(id);
          reject(error instanceof Error ? error : new Error(String(error)));
        }
      });
    });
  }

  private handleStdout(chunk: Buffer): void {
    this.buffer += chunk.toString("utf8");
    let newlineIndex = this.buffer.indexOf("\n");
    while (newlineIndex !== -1) {
      const line = this.buffer.slice(0, newlineIndex).trim();
      this.buffer = this.buffer.slice(newlineIndex + 1);
      if (line.length > 0) this.handleMessage(line);
      newlineIndex = this.buffer.indexOf("\n");
    }
  }

  private handleMessage(line: string): void {
    let message: HelperMessage;
    try {
      message = JSON.parse(line) as HelperMessage;
    } catch (error) {
      console.error("[dictation:helper] bad message:", line, error);
      return;
    }

    if (message.id?.startsWith("event.")) {
      const event = message.result?.event;
      const params = message.result?.params;
      if (event === "audio" && params) {
        this.emit("audio", params as unknown as AudioChunkPayload);
      } else if (event === "hotkey" && params) {
        this.emit("hotkey", params as unknown as HotkeyEventPayload);
      } else if (event === "dumpHotkey" && params) {
        this.emit("dumpHotkey", params as unknown as HotkeyEventPayload);
      }
      return;
    }

    const pending = this.pending.get(message.id ?? "");
    if (!pending) return;
    this.pending.delete(message.id ?? "");
    if (message.error) {
      pending.reject(new Error(`${message.error.code}: ${message.error.message}`));
    } else {
      pending.resolve(message.result);
    }
  }

  private rejectAllPending(error: Error): void {
    for (const pending of this.pending.values()) {
      pending.reject(error);
    }
    this.pending.clear();
  }
}

interface HelperMessage {
  id?: string;
  result?: { event?: string; params?: unknown } & Record<string, unknown>;
  error?: { code: number; message: string };
}

export interface HotkeyEventPayload {
  kind: "press" | "release";
  accelerator: string;
  observedAt: string;
}

const normalizePermission = (raw: string | undefined): "granted" | "denied" | "undetermined" => {
  if (raw === "granted") return "granted";
  if (raw === "denied") return "denied";
  return "undetermined";
};

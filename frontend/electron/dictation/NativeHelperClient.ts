import { spawn, type ChildProcess } from "node:child_process";
import { EventEmitter } from "node:events";
import { randomUUID } from "node:crypto";

import type { AudioChunkPayload, FocusedTarget } from "./types";

/**
 * Wraps the `mozgoslav-dictation-helper` Swift binary. Messages flow as
 * newline-delimited JSON-RPC on the child's stdin/stdout. The client exposes
 * three entry points: `start/stop` for mic capture, `injectText` for text
 * injection, `detectTarget` for focused-app introspection. Audio chunks are
 * surfaced as `"audio"` events on the emitter.
 */
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
    this.process = spawn(this.binaryPath, [], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    this.process.stdout?.on("data", (chunk: Buffer) => this.handleStdout(chunk));
    this.process.stderr?.on("data", (chunk: Buffer) => {
      console.error(`[dictation:helper:err] ${chunk.toString().trimEnd()}`);
    });
    this.process.on("exit", (code, signal) => {
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

  /**
   * Plan v0.8 Block 3 §2.4 — start recording directly into a WAV file
   * (distinct from the streaming `capture.start` used for live dictation).
   * The helper echoes every audio callback into the given output path using
   * AVAudioEngine + a resampler node to the 16 kHz mono format Whisper
   * expects.
   */
  async startFileCapture(outputPath: string, sessionId: string): Promise<void> {
    await this.send<object>("capture.startFile", {
      outputPath,
      sessionId,
      sampleRate: 16000,
      channels: 1,
      format: "wav",
    });
  }

  async stopFileCapture(sessionId: string): Promise<{ path: string; durationMs: number }> {
    const result = (await this.send<{ path: string; durationMs: number }>(
      "capture.stopFile",
      { sessionId },
    )) ?? { path: "", durationMs: 0 };
    return result;
  }

  /**
   * Plan v0.8 Block 3 §2.4 — single-shot permission probe. Returns the
   * three macOS authorization states that gate the recording + dictation
   * features (Onboarding Block 4 uses this to auto-advance the permissions
   * card).
   */
  async checkPermissions(): Promise<{
    microphone: "granted" | "denied" | "undetermined";
    accessibility: "granted" | "denied" | "undetermined";
    inputMonitoring: "granted" | "denied" | "undetermined";
  }> {
    const result = (await this.send<{
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
    if (!this.process) {
      return Promise.reject(new Error("helper process not running"));
    }
    const id = randomUUID();
    const payload = JSON.stringify({ id, method, params });
    return new Promise<T | undefined>((resolve, reject) => {
      this.pending.set(id, {
        resolve: (value) => resolve(value as T | undefined),
        reject,
      });
      this.process!.stdin?.write(`${payload}\n`);
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

const normalizePermission = (
  raw: string | undefined,
): "granted" | "denied" | "undetermined" => {
  if (raw === "granted") return "granted";
  if (raw === "denied") return "denied";
  return "undetermined";
};

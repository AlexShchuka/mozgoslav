import { net } from "electron";

import { HotkeyMonitor } from "./HotkeyMonitor";
import { NativeHelperClient, type HotkeyEventPayload } from "./NativeHelperClient";
import { OverlayWindow } from "./OverlayWindow";
import { PhaseSoundPlayer } from "./PhaseSoundPlayer";
import { TrayManager } from "./TrayManager";
import type { AudioChunkPayload, DictationPhase, FinalTranscript } from "./types";

const BACKEND_ORIGIN = "http://localhost:5050";

export interface OrchestratorOptions {
  readonly helperBinaryPath: string;
  readonly mouseButton: number | null;
  readonly keyboardFallbackKeycode: number | null;
  readonly keyboardAccelerator: string | null;
  readonly sampleRate: number;
  readonly injectMode: "auto" | "cgevent" | "accessibility";
  readonly overlayEnabled: boolean;
}

export class DictationOrchestrator {
  private readonly hotkey: HotkeyMonitor;
  private readonly helper: NativeHelperClient;
  private readonly overlay: OverlayWindow;
  private readonly tray: TrayManager;
  private readonly sound: PhaseSoundPlayer;
  private sessionId: string | null = null;
  private phase: DictationPhase = "idle";
  private partialText = "";
  private sseController: AbortController | null = null;

  constructor(private readonly options: OrchestratorOptions) {
    this.hotkey = new HotkeyMonitor(options.mouseButton, options.keyboardFallbackKeycode);
    this.helper = new NativeHelperClient(options.helperBinaryPath);
    this.overlay = new OverlayWindow();
    this.tray = new TrayManager();
    this.sound = new PhaseSoundPlayer();
  }

  async initialize(onQuit: () => void): Promise<void> {
    this.tray.build(onQuit);
    this.helper.start();
    this.helper.on("audio", (chunk: AudioChunkPayload) => {
      void this.pushAudioToBackend(chunk);
    });
    this.helper.on("hotkey", (payload: HotkeyEventPayload) => {
      if (payload.kind === "press") void this.handlePress();
      else void this.handleRelease();
    });

    this.hotkey.on("hotkey", (event) => {
      if (event.type === "press") void this.handlePress();
      else void this.handleRelease();
    });

    if (this.options.mouseButton !== null) {
      await this.hotkey.start();
    }

    if (this.options.keyboardAccelerator) {
      await this.helper.startHotkey(this.options.keyboardAccelerator);
    }
  }

  async injectText(text: string, mode: "auto" | "cgevent" | "accessibility"): Promise<void> {
    await this.helper.injectText(text, mode);
  }

  async configurePushToTalk(options: {
    mouseButton: number | null;
    keyboardAccelerator: string | null;
  }): Promise<void> {
    this.hotkey.setMouseButton(options.mouseButton);
    if (options.mouseButton !== null) {
      await this.hotkey.start();
    } else {
      this.hotkey.stop();
    }

    if (options.keyboardAccelerator) {
      await this.helper.startHotkey(options.keyboardAccelerator);
    } else {
      await this.helper.stopHotkey();
    }
  }

  destroy(): void {
    this.hotkey.stop();
    this.helper.stop();
    this.overlay.destroy();
    this.tray.destroy();
    this.sseController?.abort();
  }

  async startKeyboardHotkey(accelerator: string): Promise<void> {
    await this.helper.startHotkey(accelerator);
  }

  async stopKeyboardHotkey(): Promise<void> {
    await this.helper.stopHotkey();
  }

  onKeyboardHotkeyEvent(
    cb: (payload: { kind: "press" | "release"; accelerator: string; observedAt: string }) => void
  ): void {
    this.helper.on("hotkey", cb);
  }

  private async handlePress(): Promise<void> {
    if (this.phase !== "idle") return;

    this.setPhase("recording");
    this.partialText = "";
    if (this.options.overlayEnabled) {
      this.overlay.show();
      this.overlay.updateState("recording", "");
    }

    try {
      const start = await this.backendFetch("/api/dictation/start", { method: "POST" });
      const body = (await start.json()) as { sessionId: string };
      this.sessionId = body.sessionId;
      await this.helper.captureStart(this.options.sampleRate);
      this.startSseSubscription(body.sessionId);
    } catch (error) {
      console.error("[dictation] start failed:", error);
      this.setPhase("error");
      if (this.options.overlayEnabled) this.overlay.updateState("error", "");
      this.cleanupAfterFailure();
    }
  }

  private async handleRelease(): Promise<void> {
    if (this.phase !== "recording" || !this.sessionId) return;
    const sessionId = this.sessionId;

    this.setPhase("processing");
    if (this.options.overlayEnabled) this.overlay.updateState("processing", this.partialText);

    try {
      await this.helper.captureStop();
      const response = await this.backendFetch(`/api/dictation/stop/${sessionId}`, {
        method: "POST",
      });
      const final = (await response.json()) as FinalTranscript;
      this.setPhase("injecting");
      if (this.options.overlayEnabled) this.overlay.updateState("injecting", final.polishedText);
      await this.helper.injectText(final.polishedText, this.options.injectMode);
    } catch (error) {
      console.error("[dictation] stop failed:", error);
      this.setPhase("error");
    } finally {
      this.sessionId = null;
      this.sseController?.abort();
      this.sseController = null;
      if (this.options.overlayEnabled) this.overlay.scheduleHide();
      this.setPhase("idle");
    }
  }

  private cleanupAfterFailure(): void {
    this.sessionId = null;
    this.sseController?.abort();
    this.sseController = null;
    if (this.options.overlayEnabled) this.overlay.scheduleHide();
    this.setPhase("idle");
  }

  private setPhase(phase: DictationPhase): void {
    this.phase = phase;
    this.tray.setPhase(phase);
    this.sound.handleTransition(phase);
  }

  private startSseSubscription(sessionId: string): void {
    this.sseController = new AbortController();
    const request = net.request({
      method: "GET",
      url: `${BACKEND_ORIGIN}/api/dictation/stream/${sessionId}`,
    });
    request.on("response", (response) => {
      response.on("data", (chunk: Buffer) => this.parseSseChunk(chunk.toString("utf8")));
      response.on("end", () => {
        this.sseController = null;
      });
      response.on("error", (error) => {
        console.error("[dictation:sse] error:", error);
      });
    });
    request.on("error", (error) => {
      console.error("[dictation:sse] request error:", error);
    });
    request.end();
    this.sseController.signal.addEventListener("abort", () => {
      try {
        request.abort();
      } catch {}
    });
  }

  private parseSseChunk(raw: string): void {
    for (const block of raw.split("\n\n")) {
      if (!block.trim().length) continue;
      let event = "message";
      let data = "";
      for (const line of block.split("\n")) {
        if (line.startsWith("event:")) event = line.slice("event:".length).trim();
        else if (line.startsWith("data:")) data += line.slice("data:".length).trim();
      }
      if (event === "partial" && data.length > 0) {
        try {
          const parsed = JSON.parse(data) as { text: string };
          this.partialText = parsed.text;
          if (this.options.overlayEnabled) this.overlay.updateState("recording", parsed.text);
        } catch (error) {
          console.error("[dictation:sse] bad payload:", data, error);
        }
      }
    }
  }

  private async pushAudioToBackend(chunk: AudioChunkPayload): Promise<void> {
    if (!this.sessionId) return;
    try {
      await this.backendFetch(`/api/dictation/push/${this.sessionId}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          samples: chunk.samples,
          sampleRate: chunk.sampleRate,
          offsetSeconds: chunk.offsetMs / 1000,
        }),
      });
    } catch (error) {
      console.error("[dictation] push failed:", error);
    }
  }

  private async backendFetch(
    path: string,
    init: { method: string; headers?: Record<string, string>; body?: string }
  ): Promise<{ json: () => Promise<unknown> }> {
    return new Promise((resolve, reject) => {
      const request = net.request({
        method: init.method,
        url: `${BACKEND_ORIGIN}${path}`,
      });
      for (const [key, value] of Object.entries(init.headers ?? {})) {
        request.setHeader(key, value);
      }
      const chunks: Buffer[] = [];
      request.on("response", (response) => {
        response.on("data", (chunk: Buffer) => chunks.push(chunk));
        response.on("end", () => {
          const body = Buffer.concat(chunks).toString("utf8");
          resolve({ json: async () => JSON.parse(body) as unknown });
        });
        response.on("error", (error) => reject(error));
      });
      request.on("error", (error) => reject(error));
      if (init.body) request.write(init.body);
      request.end();
    });
  }
}

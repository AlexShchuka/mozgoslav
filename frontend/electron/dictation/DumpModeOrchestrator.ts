import { globalShortcut, net } from "electron";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { OverlayWindow } from "./OverlayWindow";
import type { HotkeyEventPayload, NativeHelperClient } from "./NativeHelperClient";

const BACKEND_ORIGIN = "http://localhost:5050";

export interface DumpModeOrchestratorOptions {
  readonly helper: NativeHelperClient;
  readonly backendOrigin: string;
  readonly tempDir: string;
  readonly overlayEnabled: boolean;
}

type DumpPhase = "idle" | "recording" | "processing";

export class DumpModeOrchestrator {
  private readonly helper: NativeHelperClient;
  private readonly backendOrigin: string;
  private readonly tempDir: string;
  private readonly overlay: OverlayWindow | null;

  private toggleAccelerator: string | null = null;
  private holdAccelerator: string | null = null;
  private holding = false;

  private phase: DumpPhase = "idle";
  private currentSessionId: string | null = null;
  private currentFilePath: string | null = null;
  private partialSseController: AbortController | null = null;

  constructor(options: DumpModeOrchestratorOptions) {
    this.helper = options.helper;
    this.backendOrigin = options.backendOrigin;
    this.tempDir = options.tempDir;
    this.overlay = options.overlayEnabled ? new OverlayWindow() : null;

    this.helper.on("dumpHotkey", (payload: HotkeyEventPayload) => {
      if (payload.kind === "press") {
        void this.handleHoldPress();
      } else {
        void this.handleHoldRelease();
      }
    });
  }

  async bindToggle(accelerator: string | null): Promise<void> {
    if (this.toggleAccelerator) {
      try {
        globalShortcut.unregister(this.toggleAccelerator);
      } catch (err) {
        console.warn("[dump-mode] unregister toggle accelerator failed:", err);
      }
      this.toggleAccelerator = null;
    }
    if (!accelerator) return;

    if (globalShortcut.isRegistered(accelerator)) {
      console.info(
        `[dump-mode] accelerator '${accelerator}' was claimed elsewhere in this process — taking ownership`
      );
      try {
        globalShortcut.unregister(accelerator);
      } catch (err) {
        console.warn("[dump-mode] unregister conflicting accelerator failed:", err);
      }
    }

    const ok = globalShortcut.register(accelerator, () => {
      void this.handleToggle();
    });
    if (!ok) {
      console.warn(
        `[dump-mode] failed to register toggle accelerator '${accelerator}' (already taken by another process / OS)`
      );
      return;
    }
    this.toggleAccelerator = accelerator;
    console.info(`[dump-mode] toggle accelerator registered: '${accelerator}'`);
  }

  async bindHold(accelerator: string | null): Promise<void> {
    if (this.holdAccelerator) {
      try {
        await this.helper.stopDumpHotkey();
      } catch (err) {
        console.warn("[dump-mode] stop hold hotkey failed:", err);
      }
      this.holdAccelerator = null;
    }
    if (!accelerator) return;

    try {
      await this.helper.startDumpHotkey(accelerator);
      this.holdAccelerator = accelerator;
      console.info(`[dump-mode] hold accelerator registered: '${accelerator}'`);
    } catch (err) {
      console.error(`[dump-mode] failed to register hold accelerator '${accelerator}':`, err);
    }
  }

  async unbindAll(): Promise<void> {
    if (this.toggleAccelerator) {
      try {
        globalShortcut.unregister(this.toggleAccelerator);
      } catch {}
      this.toggleAccelerator = null;
    }
    if (this.holdAccelerator) {
      try {
        await this.helper.stopDumpHotkey();
      } catch {}
      this.holdAccelerator = null;
    }
  }

  destroy(): void {
    void this.unbindAll();
    this.overlay?.destroy();
  }

  private async handleToggle(): Promise<void> {
    if (this.phase === "idle") {
      await this.startCapture();
    } else if (this.phase === "recording") {
      await this.stopCaptureAndSubmit();
    }
  }

  private async handleHoldPress(): Promise<void> {
    if (this.phase !== "idle" || this.holding) return;
    this.holding = true;
    await this.startCapture();
  }

  private async handleHoldRelease(): Promise<void> {
    if (!this.holding) return;
    this.holding = false;
    if (this.phase === "recording") {
      await this.stopCaptureAndSubmit();
    }
  }

  private async startCapture(): Promise<void> {
    const sessionId = `dump-${Date.now()}-${randomUUID()}`;
    const streamSessionId = randomUUID();
    const filePath = path.join(this.tempDir, `${sessionId}.wav`);

    this.phase = "recording";
    this.currentSessionId = sessionId;
    this.currentFilePath = filePath;

    if (this.overlay) {
      this.overlay.show();
      this.overlay.updateState("recording", "");
    }

    try {
      await this.helper.startFileCapture(filePath, sessionId, {
        streamSessionId,
        backendBaseUrl: this.backendOrigin,
      });
      console.info(`[dump-mode] capture started sessionId=${sessionId} streamSessionId=${streamSessionId} path=${filePath}`);
      this.startPartialSseSubscription(streamSessionId);
    } catch (err) {
      console.error("[dump-mode] startFileCapture failed:", err);
      this.cleanup();
    }
  }

  private startPartialSseSubscription(streamSessionId: string): void {
    this.partialSseController = new AbortController();
    const request = net.request({
      method: "GET",
      url: `${BACKEND_ORIGIN}/api/dictation/stream/${streamSessionId}`,
    });
    request.on("response", (response) => {
      response.on("data", (chunk: Buffer) => {
        if (this.phase !== "recording") return;
        this.parseDumpSseChunk(chunk.toString("utf8"));
      });
      response.on("end", () => {
        this.partialSseController = null;
      });
      response.on("error", (error: Error) => {
        console.error("[dump-mode:sse] error:", error);
      });
    });
    request.on("error", (error: Error) => {
      console.error("[dump-mode:sse] request error:", error);
    });
    request.end();
    this.partialSseController.signal.addEventListener("abort", () => {
      try {
        request.abort();
      } catch {}
    });
  }

  private parseDumpSseChunk(raw: string): void {
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
          if (this.overlay) this.overlay.updateState("recording", parsed.text);
        } catch (error) {
          console.error("[dump-mode:sse] bad payload:", data, error);
        }
      }
    }
  }

  private async stopCaptureAndSubmit(): Promise<void> {
    const sessionId = this.currentSessionId;
    const fallbackPath = this.currentFilePath;
    if (!sessionId || !fallbackPath) {
      this.cleanup();
      return;
    }

    this.phase = "processing";
    if (this.overlay) this.overlay.updateState("processing", "");

    try {
      const result = await this.helper.stopFileCapture(sessionId);
      const filePath = result.path && result.path.length > 0 ? result.path : fallbackPath;
      console.info(
        `[dump-mode] capture stopped sessionId=${sessionId} path=${filePath} durationMs=${result.durationMs}`
      );
      await this.submitToPipeline(filePath);
    } catch (err) {
      console.error("[dump-mode] stopFileCapture failed:", err);
    } finally {
      this.cleanup();
    }
  }

  private cleanup(): void {
    this.partialSseController?.abort();
    this.partialSseController = null;
    this.currentSessionId = null;
    this.currentFilePath = null;
    this.holding = false;
    this.phase = "idle";
    this.overlay?.scheduleHide();
  }

  private async submitToPipeline(filePath: string): Promise<void> {
    const query = `mutation DumpModeImport($input: ImportRecordingsInput!) {
      importRecordings(input: $input) {
        recordings { id }
        errors { code message }
      }
    }`;
    const variables = { input: { filePaths: [filePath], profileId: null } };
    try {
      await this.gqlRequest(query, variables);
      console.info(`[dump-mode] queued for default-profile pipeline path=${filePath}`);
    } catch (err) {
      console.error("[dump-mode] submitToPipeline failed:", err);
    }
  }

  private gqlRequest(query: string, variables: Record<string, unknown>): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = net.request({
        method: "POST",
        url: `${this.backendOrigin}/graphql`,
      });
      request.setHeader("content-type", "application/json");
      const chunks: Buffer[] = [];
      request.on("response", (response) => {
        response.on("data", (chunk: Buffer) => chunks.push(chunk));
        response.on("end", () => {
          const body = Buffer.concat(chunks).toString("utf8");
          if (response.statusCode && response.statusCode >= 400) {
            reject(new Error(`graphql ${response.statusCode}: ${body}`));
            return;
          }
          resolve();
        });
        response.on("error", (error) => reject(error));
      });
      request.on("error", (error) => reject(error));
      request.write(JSON.stringify({ query, variables }));
      request.end();
    });
  }
}

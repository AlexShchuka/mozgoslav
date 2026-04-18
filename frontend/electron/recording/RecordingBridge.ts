import http from "node:http";
import { randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";

import { NativeHelperClient } from "../dictation/NativeHelperClient";

/**
 * Block 3 (.archive/docs/v0.8-release/03-mac-native-recorder.md §2.3). The backend talks to
 * Electron over a tiny loopback HTTP endpoint so the AVFoundation-native
 * recorder lives inside the Swift helper — there is exactly one helper
 * instance per Electron host, and exactly one hotkey / AX-permission prompt.
 *
 * The bridge intentionally stays minimal: it maps three endpoints to the
 * helper's JSON-RPC and nothing else. On non-macOS hosts the bridge is never
 * started (the backend will register `PlatformUnsupportedAudioRecorder` and
 * the renderer hides the record button via `/api/audio/capabilities`).
 */
export interface RecordingSession {
  readonly id: string;
  readonly outputPath: string;
  readonly startedAt: number;
}

export class RecordingBridge {
  private server: http.Server | null = null;
  private port = 0;
  private readonly sessions = new Map<string, RecordingSession>();

  constructor(private readonly helper: NativeHelperClient) {}

  async start(): Promise<number> {
    if (this.server) {
      return this.port;
    }

    this.server = http.createServer((req, res) => this.handle(req, res).catch((err) => {
      console.error("[record:bridge] handler failed:", err);
      if (!res.headersSent) {
        res.statusCode = 500;
        res.end(JSON.stringify({ error: String(err?.message ?? err) }));
      }
    }));

    await new Promise<void>((resolve, reject) => {
      this.server!.once("error", reject);
      this.server!.listen(0, "127.0.0.1", () => resolve());
    });

    const address = this.server.address() as AddressInfo;
    this.port = address.port;
    console.info(`[record:bridge] listening on 127.0.0.1:${this.port}`);
    return this.port;
  }

  stop(): void {
    if (this.server) {
      this.server.close();
      this.server = null;
    }
    this.sessions.clear();
  }

  get activePort(): number {
    return this.port;
  }

  private async handle(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    if (!req.url) {
      res.statusCode = 400;
      res.end();
      return;
    }

    if (req.method === "POST" && req.url === "/_internal/record/start") {
      const body = await readJson(req);
      const outputPath = typeof body?.outputPath === "string" ? body.outputPath : "";
      if (!outputPath) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: "outputPath is required" }));
        return;
      }
      const session: RecordingSession = {
        id: randomUUID(),
        outputPath,
        startedAt: Date.now(),
      };
      this.sessions.set(session.id, session);
      await this.helper.startFileCapture(outputPath, session.id);
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ sessionId: session.id }));
      return;
    }

    const stopMatch = req.url.match(/^\/_internal\/record\/stop\/([^/]+)$/);
    if (req.method === "POST" && stopMatch) {
      const sessionId = stopMatch[1]!;
      const session = this.sessions.get(sessionId);
      if (!session) {
        res.statusCode = 404;
        res.end(JSON.stringify({ error: "session not found" }));
        return;
      }
      this.sessions.delete(sessionId);
      const result = await this.helper.stopFileCapture(sessionId);
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ path: result.path, durationMs: result.durationMs }));
      return;
    }

    res.statusCode = 404;
    res.end();
  }
}

const readJson = async (req: http.IncomingMessage): Promise<Record<string, unknown>> => {
  return new Promise<Record<string, unknown>>((resolve) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk.toString();
    });
    req.on("end", () => {
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw) as Record<string, unknown>);
      } catch {
        resolve({});
      }
    });
  });
};

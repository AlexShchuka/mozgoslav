/**
 * @jest-environment node
 */
import {RecordingBridge} from "../../electron/recording/RecordingBridge";

class FakeHelper {
    public startCalls: Array<{ path: string; sessionId: string }> = [];
    public stopCalls: string[] = [];

    async startFileCapture(outputPath: string, sessionId: string): Promise<void> {
        this.startCalls.push({path: outputPath, sessionId});
    }

    async stopFileCapture(sessionId: string): Promise<{ path: string; durationMs: number }> {
        this.stopCalls.push(sessionId);
        return {path: "/tmp/out.wav", durationMs: 250};
    }
}

describe("RecordingBridge", () => {
    let helper: FakeHelper;
    let bridge: RecordingBridge;

    beforeEach(async () => {
        helper = new FakeHelper();
        bridge = new RecordingBridge(helper as unknown as never);
        await bridge.start();
    });

    afterEach(() => {
        bridge.stop();
    });

    it("delegates /_internal/record/start to the helper", async () => {
        const port = bridge.activePort;
        const response = await fetch(`http://127.0.0.1:${port}/_internal/record/start`, {
            method: "POST",
            headers: {"content-type": "application/json"},
            body: JSON.stringify({outputPath: "/tmp/out.wav"}),
        });
        expect(response.status).toBe(200);
        const body = (await response.json()) as { sessionId: string };
        expect(body.sessionId).toBeTruthy();
        expect(helper.startCalls).toHaveLength(1);
        expect(helper.startCalls[0]!.path).toBe("/tmp/out.wav");
    });

    it("returns 400 when outputPath is missing", async () => {
        const port = bridge.activePort;
        const response = await fetch(`http://127.0.0.1:${port}/_internal/record/start`, {
            method: "POST",
            headers: {"content-type": "application/json"},
            body: JSON.stringify({}),
        });
        expect(response.status).toBe(400);
    });

    it("returns 404 when stopping an unknown session", async () => {
        const port = bridge.activePort;
        const response = await fetch(`http://127.0.0.1:${port}/_internal/record/stop/unknown`, {
            method: "POST",
        });
        expect(response.status).toBe(404);
    });

    it("start then stop returns the helper's path+duration", async () => {
        const port = bridge.activePort;
        const startRes = await fetch(`http://127.0.0.1:${port}/_internal/record/start`, {
            method: "POST",
            headers: {"content-type": "application/json"},
            body: JSON.stringify({outputPath: "/tmp/out.wav"}),
        });
        const {sessionId} = (await startRes.json()) as { sessionId: string };

        const stopRes = await fetch(`http://127.0.0.1:${port}/_internal/record/stop/${sessionId}`, {
            method: "POST",
        });
        expect(stopRes.status).toBe(200);
        const body = (await stopRes.json()) as { path: string; durationMs: number };
        expect(body.path).toBe("/tmp/out.wav");
        expect(body.durationMs).toBe(250);
    });
});

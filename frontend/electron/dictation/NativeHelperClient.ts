import { ipcRenderer } from "electron";

export class NativeHelperClient {
    private static instance: NativeHelperClient;

    static getInstance(): NativeHelperClient {
        if (!NativeHelperClient.instance) {
            NativeHelperClient.instance = new NativeHelperClient();
        }
        return NativeHelperClient.instance;
    }

    async call(method: string, params?: Record<string, unknown>): Promise<unknown> {
        const id = Math.random().toString(36).slice(2);
        const message = JSON.stringify({ id, method, params });
        
        try {
            const result = await ipcRenderer.invoke("helper-call", { id, method, params });
            return result;
        } catch (error) {
            console.error(`[NativeHelperClient] call failed: ${method}`, error);
            throw error;
        }
    }

    async startHotkeyMonitoring(): Promise<void> {
        await this.call("start-hotkey-monitor");
    }

    async stopHotkeyMonitoring(): Promise<void> {
        await this.call("stop-hotkey-monitor");
    }

    async registerGlobalHotkey(id: string, key: string): Promise<void> {
        await this.call("global-hotkey.register", { id, key });
    }

    async unregisterGlobalHotkey(id: string): Promise<void> {
        await this.call("global-hotkey.unregister", { id });
    }

    async startCapture(deviceId?: string, sampleRate = 48000): Promise<void> {
        await this.call("capture.start", { deviceId, sampleRate });
    }

    async stopCapture(): Promise<void> {
        await this.call("capture.stop");
    }

    async injectText(text: string): Promise<void> {
        await this.call("inject.text", { text, mode: "auto" });
    }
}

export const nativeHelperClient = NativeHelperClient.getInstance();

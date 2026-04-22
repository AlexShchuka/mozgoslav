import BaseApi from "./BaseApi";
import {API_ENDPOINTS} from "../constants/api";

export interface StartDictationPayload {
    readonly source: string;
}

export interface StartDictationResult {
    readonly sessionId: string;
}

export interface StopDictationResult {
    readonly rawText: string;
    readonly polishedText: string;
    readonly durationMs: number;
}

export interface AudioCapabilities {
    readonly isSupported: boolean;
    readonly detectedPlatform: string;
    readonly permissionsRequired: string[];
}

export class DictationApi extends BaseApi {
    public async start(payload: StartDictationPayload): Promise<StartDictationResult> {
        const response = await this.post<StartDictationResult, StartDictationPayload>(
            API_ENDPOINTS.dictationStart,
            payload,
        );
        return response.data;
    }

    public async push(sessionId: string, audioBuffer: ArrayBuffer): Promise<void> {
        await this.post(API_ENDPOINTS.dictationPush(sessionId), audioBuffer, {
            headers: {"Content-Type": "application/octet-stream"},
            transformRequest: [(body: unknown) => body],
        });
    }

    public async stop(sessionId: string): Promise<StopDictationResult> {
        const response = await this.post<StopDictationResult>(
            API_ENDPOINTS.dictationStop(sessionId),
        );
        return response.data;
    }

    public async audioCapabilities(): Promise<AudioCapabilities> {
        const response = await this.get<AudioCapabilities>("/api/audio/capabilities");
        return response.data;
    }
}

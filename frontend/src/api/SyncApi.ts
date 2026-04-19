import axios, {AxiosInstance} from "axios";

import {API_ENDPOINTS, BACKEND_URL} from "../constants/api";
import type {SyncPairingPayload, SyncStatusSnapshot,} from "../store/slices/sync/types";

/**
 * Thin typed client for the /api/sync/* endpoints exposed by the backend.
 * The SSE stream is consumed directly by the saga via {@link createSyncEventSource}
 * — wrapping `EventSource` in an axios call buys nothing and complicates retry.
 */
export class SyncApi {
    private readonly client: AxiosInstance;

    constructor(baseURL: string = BACKEND_URL) {
        this.client = axios.create({baseURL, timeout: 10_000});
    }

    getStatus = async (): Promise<SyncStatusSnapshot> =>
        (await this.client.get<SyncStatusSnapshot>(API_ENDPOINTS.syncStatus)).data;

    getPairingPayload = async (): Promise<SyncPairingPayload> =>
        (await this.client.get<SyncPairingPayload>(API_ENDPOINTS.syncPairingPayload)).data;

    acceptDevice = async (deviceId: string, name: string): Promise<{ accepted: boolean }> =>
        (await this.client.post<{ accepted: boolean }>(API_ENDPOINTS.syncAcceptDevice, {
            deviceId,
            name,
        })).data;
}

export const syncApi = new SyncApi();

export const createSyncEventSource = (baseURL: string = BACKEND_URL): EventSource =>
    new EventSource(`${baseURL}${API_ENDPOINTS.syncEvents}`);

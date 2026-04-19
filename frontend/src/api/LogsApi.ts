import BaseApi from "./BaseApi";
import {API_ENDPOINTS} from "../constants/api";

export interface LogTail {
    readonly file: string;
    readonly lines: string[];
}

export interface LogFile {
    readonly name: string;
    readonly path: string;
    readonly sizeBytes: number;
    readonly modifiedAt: string;
}

export class LogsApi extends BaseApi {
    public async list(): Promise<LogFile[]> {
        const response = await this.get<LogFile[]>(API_ENDPOINTS.logs);
        return response.data;
    }

    public async tail(file?: string, lines = 200): Promise<LogTail> {
        const response = await this.get<LogTail>(API_ENDPOINTS.logsTail, {
            params: {file, lines},
        });
        return response.data;
    }
}

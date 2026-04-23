import BaseApi from "./BaseApi";
import {API_ENDPOINTS} from "../constants/api";
import type {RagAnswer} from "../domain/Rag";

export interface RagReindexResult {
    readonly embeddedNotes: number;
    readonly chunks: number;
}

export interface RagStatusResult {
    readonly chunks: number;
    readonly notes: number;
}

export class RagApi extends BaseApi {
    public async query(question: string, topK?: number): Promise<RagAnswer> {
        const response = await this.post<RagAnswer, { question: string; topK?: number }>(
            API_ENDPOINTS.ragQuery,
            {question, topK},
        );
        return response.data;
    }

    public async reindex(): Promise<RagReindexResult> {
        const response = await this.post<RagReindexResult>(API_ENDPOINTS.ragReindex);
        return response.data;
    }

    public async status(): Promise<RagStatusResult> {
        const response = await this.get<RagStatusResult>(API_ENDPOINTS.ragStatus);
        return response.data;
    }
}

import BaseApi from "./BaseApi";
import { API_ENDPOINTS } from "../constants/api";
import type { ProcessingJob } from "../domain/ProcessingJob";

export class JobsApi extends BaseApi {
  public async list(): Promise<ProcessingJob[]> {
    const response = await this.get<ProcessingJob[]>(API_ENDPOINTS.jobs);
    return response.data;
  }

  public async listActive(): Promise<ProcessingJob[]> {
    const response = await this.get<ProcessingJob[]>(API_ENDPOINTS.jobsActive);
    return response.data;
  }

  // ADR-015 — queued / running jobs get cancelled through this endpoint.
  // Backend flips the row to Cancelled (Queued → 204) or sets CancelRequested
  // and signals the worker CTS (Active → 202); the SSE stream emits the final
  // Cancelled state either way.
  public async cancel(id: string): Promise<void> {
    await this.post<void>(API_ENDPOINTS.queueCancel(id));
  }
}

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

  public async cancel(id: string): Promise<void> {
    await this.post<void>(API_ENDPOINTS.queueCancel(id));
  }
}

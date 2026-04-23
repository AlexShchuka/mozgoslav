import BaseApi from "./BaseApi";
import { API_ENDPOINTS } from "../constants/api";

export class HealthApi extends BaseApi {
  public async getHealth(): Promise<{ status: string }> {
    const response = await this.get<{ status: string }>(API_ENDPOINTS.health);
    return response.data;
  }

  public async checkLlm(): Promise<boolean> {
    const response = await this.get<{ available: boolean }>(API_ENDPOINTS.llmHealth);
    return response.data.available;
  }
}

import BaseApi from "./BaseApi";
import { AppSettings } from "../types/Settings";
import { API_ENDPOINTS } from "../constants/api";

export class SettingsApi extends BaseApi {
  async getSettings(): Promise<AppSettings> {
    const response = await this.get<AppSettings>(API_ENDPOINTS.settings);
    return response.data;
  }

  async saveSettings(settings: AppSettings): Promise<AppSettings> {
    const response = await this.put<AppSettings, AppSettings>(API_ENDPOINTS.settings, settings);
    return response.data;
  }

  async checkLlm(): Promise<boolean> {
    const response = await this.get<{ available: boolean }>(API_ENDPOINTS.llmHealth);
    return response.data.available;
  }
}

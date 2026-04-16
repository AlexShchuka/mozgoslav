import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";

export type ApiRequestConfig = Omit<AxiosRequestConfig, "baseURL">;

export type ApiReturnType<T> = Promise<AxiosResponse<T>>;

class BaseApi {
  private readonly client: AxiosInstance;
  private readonly defaultConfig: AxiosRequestConfig;

  constructor(client: AxiosInstance, baseURL: string) {
    this.client = client;
    this.defaultConfig = { baseURL };
  }

  protected get<T>(url: string, config?: ApiRequestConfig): ApiReturnType<T> {
    return this.client.get<T>(url, this.createConfig(config));
  }

  protected post<T, TData = unknown>(
    url: string,
    data?: TData,
    config?: ApiRequestConfig
  ): ApiReturnType<T> {
    return this.client.post<T>(url, data, this.createConfig(config));
  }

  protected put<T, TData = unknown>(
    url: string,
    data?: TData,
    config?: ApiRequestConfig
  ): ApiReturnType<T> {
    return this.client.put<T>(url, data, this.createConfig(config));
  }

  protected delete<T>(url: string, config?: ApiRequestConfig): ApiReturnType<T> {
    return this.client.delete<T>(url, this.createConfig(config));
  }

  private createConfig(config?: ApiRequestConfig): AxiosRequestConfig {
    if (!config) {
      return this.defaultConfig;
    }
    return {
      ...config,
      ...this.defaultConfig,
    };
  }
}

export default BaseApi;

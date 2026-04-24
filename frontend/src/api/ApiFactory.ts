import axios, { type AxiosInstance } from "axios";
import { BACKEND_URL } from "../constants/api";
import { ObsidianApi } from "./ObsidianApi";

export interface ApiFactory {
  createObsidianApi(client?: AxiosInstance): ObsidianApi;
}

let sharedClient: AxiosInstance | null = null;

const getDefaultClient = (): AxiosInstance => {
  if (!sharedClient) {
    sharedClient = axios.create({
      timeout: 30_000,
      headers: { Accept: "application/json" },
    });
  }
  return sharedClient;
};

const pick = (client?: AxiosInstance): AxiosInstance => client ?? getDefaultClient();

const apiFactory: ApiFactory = {
  createObsidianApi: (client) => new ObsidianApi(pick(client), BACKEND_URL),
};

export default apiFactory;

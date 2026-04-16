import axios, { type AxiosInstance } from "axios";
import { BACKEND_URL } from "../constants/api";
import { RecordingApi } from "./RecordingApi";

export interface ApiFactory {
  createRecordingApi(client?: AxiosInstance): RecordingApi;
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

const apiFactory: ApiFactory = {
  createRecordingApi: (client) => new RecordingApi(client ?? getDefaultClient(), BACKEND_URL),
};

export default apiFactory;

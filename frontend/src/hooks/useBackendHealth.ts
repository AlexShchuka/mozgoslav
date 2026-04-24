import { useEffect, useState } from "react";
import axios from "axios";
import { BACKEND_URL, HEALTH_POLL_INTERVAL_MS } from "../constants/api";

export type BackendHealthStatus = "unknown" | "ok" | "down";

export interface BackendHealth {
  status: BackendHealthStatus;
  lastCheckedAt: Date | null;
}

export const useBackendHealth = (intervalMs: number = HEALTH_POLL_INTERVAL_MS): BackendHealth => {
  const [health, setHealth] = useState<BackendHealth>({
    status: "unknown",
    lastCheckedAt: null,
  });

  useEffect(() => {
    let cancelled = false;

    const check = async (): Promise<void> => {
      try {
        const response = await axios.get(`${BACKEND_URL}/api/health`, {
          timeout: 2000,
        });
        if (cancelled) {
          return;
        }
        setHealth({
          status: response.status >= 200 && response.status < 300 ? "ok" : "down",
          lastCheckedAt: new Date(),
        });
      } catch {
        if (cancelled) {
          return;
        }
        setHealth({ status: "down", lastCheckedAt: new Date() });
      }
    };

    void check();
    const timer = setInterval(() => {
      void check();
    }, intervalMs);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [intervalMs]);

  return health;
};

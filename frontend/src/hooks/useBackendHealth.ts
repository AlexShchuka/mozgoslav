import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { Action, Dispatch } from "redux";

import { HEALTH_POLL_INTERVAL_MS } from "../constants/api";
import {
  type BackendHealthStatus,
  healthProbeRequested,
  selectBackendHealth,
} from "../store/slices/health";

export type { BackendHealthStatus };

export interface BackendHealth {
  status: BackendHealthStatus;
  lastCheckedAt: Date | null;
}

export const useBackendHealth = (intervalMs: number = HEALTH_POLL_INTERVAL_MS): BackendHealth => {
  const dispatch = useDispatch<Dispatch<Action>>();
  const slice = useSelector(selectBackendHealth);

  useEffect(() => {
    const timer = setInterval(() => {
      dispatch(healthProbeRequested());
    }, intervalMs);
    return () => clearInterval(timer);
  }, [dispatch, intervalMs]);

  return {
    status: slice.status,
    lastCheckedAt: slice.lastCheckedAt ? new Date(slice.lastCheckedAt) : null,
  };
};

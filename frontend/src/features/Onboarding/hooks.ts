import { useEffect, useState } from "react";

import { api } from "../../api/MozgoslavApi";

/**
 * Plan v0.8 Block 4 §3.1 — LLM health poller. Runs at a 3 s cadence while
 * the caller is on the LLM card; stops on unmount or detection flip.
 */
export const useLlmDetection = (enabled: boolean): { reachable: boolean } => {
  const [reachable, setReachable] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    const poll = async () => {
      try {
        const value = await api.llmHealth();
        if (active) setReachable(value);
      } catch {
        if (active) setReachable(false);
      }
    };
    void poll();
    const handle = window.setInterval(poll, 3000);
    return () => {
      active = false;
      window.clearInterval(handle);
    };
  }, [enabled]);

  return { reachable };
};

/**
 * Plan v0.8 Block 4 §3.1 — Obsidian vault autodetect. Single poll on mount +
 * every 5 seconds while the caller is on the Obsidian card.
 */
export const useObsidianDetection = (
  enabled: boolean,
): { detected: Array<{ path: string; name: string }>; loaded: boolean } => {
  const [state, setState] = useState<{
    detected: Array<{ path: string; name: string }>;
    loaded: boolean;
  }>({ detected: [], loaded: false });

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    const poll = async () => {
      try {
        const result = await api.detectObsidian();
        if (active) setState({ detected: result.detected, loaded: true });
      } catch {
        if (active) setState({ detected: [], loaded: true });
      }
    };
    void poll();
    const handle = window.setInterval(poll, 5000);
    return () => {
      active = false;
      window.clearInterval(handle);
    };
  }, [enabled]);

  return state;
};

export interface AudioCapabilities {
  isSupported: boolean;
  detectedPlatform: string;
  permissionsRequired: string[];
}

/**
 * Plan v0.8 Block 4 §3.1 — permission / capability probe. Single poll on
 * mount + 2 s cadence while the user is on the permissions card.
 */
export const useAudioPermissions = (
  enabled: boolean,
): { capabilities: AudioCapabilities | null; loaded: boolean } => {
  const [state, setState] = useState<{
    capabilities: AudioCapabilities | null;
    loaded: boolean;
  }>({ capabilities: null, loaded: false });

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    const poll = async () => {
      try {
        const result = await api.audioCapabilities();
        if (active) setState({ capabilities: result, loaded: true });
      } catch {
        if (active) setState({ capabilities: null, loaded: true });
      }
    };
    void poll();
    const handle = window.setInterval(poll, 2000);
    return () => {
      active = false;
      window.clearInterval(handle);
    };
  }, [enabled]);

  return state;
};

import { useEffect, useState } from "react";

import { graphqlClient } from "../../api/graphqlClient";
import {
  QueryDictationAudioCapabilitiesDocument,
  QueryLlmHealthDocument,
  QueryObsidianDetectDocument,
} from "../../api/gql/graphql";

export const useLlmDetection = (enabled: boolean): { reachable: boolean } => {
  const [reachable, setReachable] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    const poll = async () => {
      try {
        const data = await graphqlClient.request(QueryLlmHealthDocument);
        if (active) setReachable(data.llmHealth.available);
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

export const useObsidianDetection = (
  enabled: boolean
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
        const data = await graphqlClient.request(QueryObsidianDetectDocument);
        if (active) {
          setState({ detected: data.obsidianDetect.detected, loaded: true });
        }
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

export const useAudioPermissions = (
  enabled: boolean
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
        const data = await graphqlClient.request(QueryDictationAudioCapabilitiesDocument);
        if (active) {
          setState({
            capabilities: {
              isSupported: data.dictationAudioCapabilities.isSupported,
              detectedPlatform: data.dictationAudioCapabilities.detectedPlatform,
              permissionsRequired: data.dictationAudioCapabilities.permissionsRequired,
            },
            loaded: true,
          });
        }
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

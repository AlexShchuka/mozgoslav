import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { Action, Dispatch } from "redux";

import {
  selectAudioCapabilities,
  selectLlmHealth,
  selectObsidianDetection,
  startAudioCapabilitiesProbe,
  startLlmHealthProbe,
  startObsidianDetectProbe,
  stopAudioCapabilitiesProbe,
  stopLlmHealthProbe,
  stopObsidianDetectProbe,
} from "../../store/slices/onboarding";
import type {
  AudioCapabilitiesState,
  LlmHealth,
  ObsidianDetection,
} from "../../store/slices/onboarding";

export type { AudioCapabilities } from "../../store/slices/onboarding/types";

export const useLlmDetection = (enabled: boolean): { reachable: boolean } => {
  const dispatch = useDispatch<Dispatch<Action>>();
  const { reachable } = useSelector(selectLlmHealth) as LlmHealth;
  useEffect(() => {
    if (!enabled) return;
    dispatch(startLlmHealthProbe());
    return () => {
      dispatch(stopLlmHealthProbe());
    };
  }, [enabled, dispatch]);
  return { reachable };
};

export const useObsidianDetection = (
  enabled: boolean
): { detected: Array<{ path: string; name: string }>; loaded: boolean } => {
  const dispatch = useDispatch<Dispatch<Action>>();
  const { detected, loaded } = useSelector(selectObsidianDetection) as ObsidianDetection;
  useEffect(() => {
    if (!enabled) return;
    dispatch(startObsidianDetectProbe());
    return () => {
      dispatch(stopObsidianDetectProbe());
    };
  }, [enabled, dispatch]);
  return { detected: detected as Array<{ path: string; name: string }>, loaded };
};

export const useAudioPermissions = (
  enabled: boolean
): { capabilities: AudioCapabilitiesState["capabilities"]; loaded: boolean } => {
  const dispatch = useDispatch<Dispatch<Action>>();
  const { capabilities, loaded } = useSelector(selectAudioCapabilities) as AudioCapabilitiesState;
  useEffect(() => {
    if (!enabled) return;
    dispatch(startAudioCapabilitiesProbe());
    return () => {
      dispatch(stopAudioCapabilitiesProbe());
    };
  }, [enabled, dispatch]);
  return { capabilities, loaded };
};

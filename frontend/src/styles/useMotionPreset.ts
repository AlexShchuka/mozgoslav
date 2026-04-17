import { useMemo } from "react";
import { useReducedMotion } from "motion/react";

import { MotionPreset, MotionPresetName, resolveMotionPreset } from "./motion";

/**
 * Resolve a named motion preset against the user's prefers-reduced-motion
 * setting. Reduced users collapse to a 0ms identity transition.
 */
export const useMotionPreset = (name: MotionPresetName): MotionPreset => {
  const reduced = useReducedMotion() ?? false;
  return useMemo(() => resolveMotionPreset(name, reduced), [name, reduced]);
};

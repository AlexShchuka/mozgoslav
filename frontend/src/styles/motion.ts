import type { Transition } from "framer-motion";

export type MotionPresetName =
  | "buttonPress"
  | "buttonRelease"
  | "modalEnter"
  | "modalExit"
  | "pageCrossFade"
  | "trayIconState"
  | "toastSlideIn"
  | "listItemEnter"
  | "queueRowCancel";

export interface MotionPreset {
  readonly animate: Record<string, number | string>;
  readonly initial?: Record<string, number | string>;
  readonly exit?: Record<string, number | string>;
  readonly transition: Transition;
}

export const motionPresets: Record<MotionPresetName, MotionPreset> = {
  buttonPress: {
    animate: { scale: 0.96, opacity: 0.82 },
    transition: { type: "spring", stiffness: 420, damping: 28 },
  },
  buttonRelease: {
    animate: { scale: 1, opacity: 1 },
    transition: { type: "spring", stiffness: 300, damping: 20 },
  },
  modalEnter: {
    initial: { scale: 0.96, y: 8, opacity: 0 },
    animate: { scale: 1, y: 0, opacity: 1 },
    transition: { duration: 0.26, ease: [0.22, 1, 0.36, 1] },
  },
  modalExit: {
    animate: { scale: 0.96, y: 8, opacity: 0 },
    transition: { duration: 0.18, ease: [0.32, 0, 0.67, 0] },
  },
  pageCrossFade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.18, ease: "easeOut" },
  },
  trayIconState: {
    animate: { scale: 1 },
    transition: { type: "spring", stiffness: 180, damping: 18, mass: 0.9 },
  },
  toastSlideIn: {
    initial: { y: 24, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    transition: { type: "spring", stiffness: 260, damping: 22 },
  },
  listItemEnter: {
    initial: { y: 8, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    transition: { duration: 0.12, ease: "easeOut" },
  },
  queueRowCancel: {
    animate: { opacity: 0, height: 0, marginBottom: 0 },
    transition: { duration: 0.18, ease: "easeOut" },
  },
};

const reducedTransition: Transition = { duration: 0 };
const reducedAnimate = { opacity: 1, scale: 1, y: 0, height: "auto", marginBottom: undefined };

export const resolveMotionPreset = (
  name: MotionPresetName,
  reduced: boolean,
): MotionPreset => {
  const base = motionPresets[name];
  if (!reduced) return base;
  return {
    animate: { ...base.animate, ...reducedAnimate },
    initial: base.initial ? { ...base.initial, ...reducedAnimate } : undefined,
    exit: base.exit ? { ...base.exit, ...reducedAnimate } : undefined,
    transition: reducedTransition,
  };
};

export const listStaggerMs = 40;

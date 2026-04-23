import type { Transition, Variants } from "framer-motion";

const springSoft: Transition = { type: "spring", stiffness: 260, damping: 28 };
const springFirm: Transition = { type: "spring", stiffness: 420, damping: 32 };

const durations = {
  instant: 0.08,
  fast: 0.15,
  base: 0.22,
  slow: 0.36,
};

const standardEase = [0.2, 0, 0, 1] as const;
const emphasizedEase = [0.3, 0, 0.1, 1] as const;

export const buttonVariants: Variants = {
  idle: { scale: 1, boxShadow: "0 0 0 0 rgba(41, 252, 195, 0)" },
  hover: {
    scale: 1.02,
    boxShadow: "0 0 0 1px rgba(41, 252, 195, 0.35), 0 8px 24px rgba(41, 252, 195, 0.18)",
    transition: springSoft,
  },
  tap: { scale: 0.98, transition: { duration: durations.instant } },
  loading: {
    boxShadow: [
      "0 0 0 0 rgba(41, 252, 195, 0)",
      "0 0 0 6px rgba(41, 252, 195, 0.2)",
      "0 0 0 0 rgba(41, 252, 195, 0)",
    ],
    transition: { duration: 1.2, repeat: Infinity, ease: "easeInOut" },
  },
};

export const cardVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: durations.base, ease: emphasizedEase },
  },
  hover: {
    y: -2,
    transition: springSoft,
  },
  tap: { scale: 0.99, transition: { duration: durations.instant } },
};

export const sidebarItemVariants: Variants = {
  inactive: { backgroundColor: "rgba(0, 0, 0, 0)" },
  hover: {
    backgroundColor: "rgba(41, 252, 195, 0.12)",
    transition: { duration: durations.fast, ease: standardEase },
  },
  active: {
    backgroundColor: "rgba(41, 252, 195, 0.12)",
    transition: { duration: durations.fast, ease: standardEase },
  },
};

export const progressBarVariants: Variants = {
  idle: {
    backgroundPositionX: "0%",
    transition: { duration: durations.base, ease: standardEase },
  },
  active: {
    backgroundPositionX: ["-100%", "200%"],
    transition: { duration: 2.0, repeat: Infinity, ease: "linear" },
  },
  complete: {
    boxShadow: [
      "0 0 0 0 rgba(41, 252, 195, 0)",
      "0 0 0 8px rgba(41, 252, 195, 0.3)",
      "0 0 0 0 rgba(41, 252, 195, 0)",
    ],
    transition: { duration: 0.6, ease: "easeOut" },
  },
};

export const toastVariants: Variants = {
  enter: {
    x: "0%",
    opacity: 1,
    transition: springFirm,
  },
  initial: { x: "100%", opacity: 0 },
  exit: { opacity: 0, transition: { duration: 0.2, ease: standardEase } },
};

export const dictationOverlayVariants: Variants = {
  initial: { opacity: 0, scale: 0.9 },
  enter: {
    opacity: 1,
    scale: 1,
    transition: springSoft,
  },
  recording: {
    boxShadow: [
      "0 0 0 0 rgba(41, 252, 195, 0.0)",
      "0 0 0 12px rgba(41, 252, 195, 0.35)",
      "0 0 0 0 rgba(41, 252, 195, 0.0)",
    ],
    transition: { duration: 1.6, repeat: Infinity, ease: "easeInOut" },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: { duration: durations.fast, ease: standardEase },
  },
};

export const onboardingStepVariants: Variants = {
  enter: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? 20 : -20,
  }),
  center: {
    opacity: 1,
    x: 0,
    transition: { duration: durations.fast, ease: emphasizedEase },
  },
  exit: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? -20 : 20,
    transition: { duration: durations.fast, ease: standardEase },
  }),
};

export const pageTransitionVariants: Variants = {
  initial: { opacity: 0, y: 6 },
  enter: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.12, ease: standardEase },
  },
  exit: {
    opacity: 0,
    y: -6,
    transition: { duration: 0.12, ease: standardEase },
  },
};

export const reducedProgressBarVariants: Variants = {
  idle: { backgroundPositionX: "0%" },
  active: { backgroundPositionX: "0%" },
  complete: { boxShadow: "0 0 0 0 rgba(41, 252, 195, 0)" },
};

export const reducedDictationOverlayVariants: Variants = {
  initial: { opacity: 0 },
  enter: { opacity: 1, transition: { duration: durations.fast } },
  recording: { boxShadow: "0 0 0 2px rgba(41, 252, 195, 0.35)" },
  exit: { opacity: 0, transition: { duration: durations.fast } },
};

export const reducedButtonVariants: Variants = {
  idle: { scale: 1, boxShadow: "0 0 0 0 rgba(41, 252, 195, 0)" },
  hover: { scale: 1 },
  tap: { scale: 1 },
  loading: { boxShadow: "0 0 0 2px rgba(41, 252, 195, 0.35)" },
};

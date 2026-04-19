import type {Transition, Variants} from "framer-motion";

/**
 * ADR-013 — framer-motion variant catalogue.
 *
 * Each exported variant is a plain `Variants` object so callers can apply it
 * to `motion.div` / `motion.button` / etc. without rebuilding the spring or
 * easing shape in every component. Durations are encoded in seconds (framer
 * expects fractional seconds, not ms strings) and deliberately mirror the
 * numeric values in `theme.motion.duration.*`.
 */

const springSoft: Transition = {type: "spring", stiffness: 260, damping: 28};
const springFirm: Transition = {type: "spring", stiffness: 420, damping: 32};

const durations = {
    instant: 0.08,
    fast: 0.15,
    base: 0.22,
    slow: 0.36,
};

const standardEase = [0.2, 0, 0, 1] as const;
const emphasizedEase = [0.3, 0, 0.1, 1] as const;

/**
 * Button — hover lift, active press, loading pulse. Pair with
 * `whileHover="hover"` + `whileTap="tap"` + `animate={isLoading ? "loading" : "idle"}`.
 */
export const buttonVariants: Variants = {
    idle: {scale: 1, boxShadow: "0 0 0 0 rgba(41, 252, 195, 0)"},
    hover: {
        scale: 1.02,
        boxShadow: "0 0 0 1px rgba(41, 252, 195, 0.35), 0 8px 24px rgba(41, 252, 195, 0.18)",
        transition: springSoft,
    },
    tap: {scale: 0.98, transition: {duration: durations.instant}},
    loading: {
        boxShadow: [
            "0 0 0 0 rgba(41, 252, 195, 0)",
            "0 0 0 6px rgba(41, 252, 195, 0.2)",
            "0 0 0 0 rgba(41, 252, 195, 0)",
        ],
        transition: {duration: 1.2, repeat: Infinity, ease: "easeInOut"},
    },
};

/**
 * Card — mount reveal (opacity + translateY), hover lift, click squish.
 * Stagger between siblings is handled at the parent via `staggerChildren`.
 */
export const cardVariants: Variants = {
    hidden: {opacity: 0, y: 8},
    show: {
        opacity: 1,
        y: 0,
        transition: {duration: durations.base, ease: emphasizedEase},
    },
    hover: {
        y: -2,
        transition: springSoft,
    },
    tap: {scale: 0.99, transition: {duration: durations.instant}},
};

/**
 * Sidebar item — active-indicator glow bar uses `layoutId="sidebar-active"` on
 * the highlighted element so framer-motion animates the glow between items.
 * The variants below control the hover/inactive surface fill.
 */
export const sidebarItemVariants: Variants = {
    inactive: {backgroundColor: "rgba(0, 0, 0, 0)"},
    hover: {
        backgroundColor: "rgba(41, 252, 195, 0.12)",
        transition: {duration: durations.fast, ease: standardEase},
    },
    active: {
        backgroundColor: "rgba(41, 252, 195, 0.12)",
        transition: {duration: durations.fast, ease: standardEase},
    },
};

/**
 * ProgressBar — fill animates from 0→value; the companion shimmer overlay
 * slides left→right infinitely while the bar is active.
 */
export const progressBarVariants: Variants = {
    idle: {
        backgroundPositionX: "0%",
        transition: {duration: durations.base, ease: standardEase},
    },
    active: {
        backgroundPositionX: ["-100%", "200%"],
        transition: {duration: 2.0, repeat: Infinity, ease: "linear"},
    },
    complete: {
        boxShadow: [
            "0 0 0 0 rgba(41, 252, 195, 0)",
            "0 0 0 8px rgba(41, 252, 195, 0.3)",
            "0 0 0 0 rgba(41, 252, 195, 0)",
        ],
        transition: {duration: 0.6, ease: "easeOut"},
    },
};

/**
 * Toast — spring-in from top-right, fade on dismiss. Apply via the
 * `react-toastify` `transition` prop (wrapped in a framer-motion adapter).
 */
export const toastVariants: Variants = {
    enter: {
        x: "0%",
        opacity: 1,
        transition: springFirm,
    },
    initial: {x: "100%", opacity: 0},
    exit: {opacity: 0, transition: {duration: 0.2, ease: standardEase}},
};

/**
 * DictationOverlay — scale-in mount, pulsing accent-glow border while
 * recording, fade-out on dismiss. Backdrop blur is applied via the style prop,
 * not via variants.
 */
export const dictationOverlayVariants: Variants = {
    initial: {opacity: 0, scale: 0.9},
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
        transition: {duration: 1.6, repeat: Infinity, ease: "easeInOut"},
    },
    exit: {
        opacity: 0,
        scale: 0.95,
        transition: {duration: durations.fast, ease: standardEase},
    },
};

/**
 * Onboarding step — slide+fade between steps. Pair with `AnimatePresence`
 * and key the motion.div on the step id for correct enter/exit.
 */
export const onboardingStepVariants: Variants = {
    enter: (direction: number) => ({
        opacity: 0,
        x: direction > 0 ? 20 : -20,
    }),
    center: {
        opacity: 1,
        x: 0,
        transition: {duration: durations.fast, ease: emphasizedEase},
    },
    exit: (direction: number) => ({
        opacity: 0,
        x: direction > 0 ? -20 : 20,
        transition: {duration: durations.fast, ease: standardEase},
    }),
};

/**
 * Page transition — wrap `<Routes>` in `<AnimatePresence>` and give each page
 * container these variants keyed on `location.pathname`.
 */
export const pageTransitionVariants: Variants = {
    initial: {opacity: 0, y: 6},
    enter: {
        opacity: 1,
        y: 0,
        transition: {duration: 0.12, ease: standardEase},
    },
    exit: {
        opacity: 0,
        y: -6,
        transition: {duration: 0.12, ease: standardEase},
    },
};

/**
 * ADR-013 reduced-motion fallbacks.
 *
 * `MotionConfig reducedMotion="user"` at the app root strips
 * transform/opacity animations automatically. These sibling variants cover
 * the cases framer does NOT strip — infinite `boxShadow` pulses on
 * ProgressBar and DictationOverlay — which would otherwise keep cycling for
 * users who asked for less motion.
 *
 * Consumer pattern:
 *   const prefersReducedMotion = useReducedMotion();
 *   const variants = prefersReducedMotion
 *     ? reducedProgressBarVariants
 *     : progressBarVariants;
 */

export const reducedProgressBarVariants: Variants = {
    idle: {backgroundPositionX: "0%"},
    active: {backgroundPositionX: "0%"},
    complete: {boxShadow: "0 0 0 0 rgba(41, 252, 195, 0)"},
};

export const reducedDictationOverlayVariants: Variants = {
    initial: {opacity: 0},
    enter: {opacity: 1, transition: {duration: durations.fast}},
    recording: {boxShadow: "0 0 0 2px rgba(41, 252, 195, 0.35)"},
    exit: {opacity: 0, transition: {duration: durations.fast}},
};

export const reducedButtonVariants: Variants = {
    idle: {scale: 1, boxShadow: "0 0 0 0 rgba(41, 252, 195, 0)"},
    hover: {scale: 1},
    tap: {scale: 1},
    loading: {boxShadow: "0 0 0 2px rgba(41, 252, 195, 0.35)"},
};

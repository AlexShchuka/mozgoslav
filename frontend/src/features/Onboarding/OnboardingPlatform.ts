/**
 * Plan v0.8 Block 4 §2.3 — platform-aware Onboarding card visibility.
 *
 * We intentionally do NOT probe `process.platform` directly because the
 * renderer runs in a sandboxed context where node globals are blocked.
 * `navigator.platform` is the canonical browser-side source; the Electron
 * preload bridge exposes `window.mozgoslav.version` for Mozgoslav-specific
 * detection if ever needed.
 */
export type OnboardingPlatform = "macos" | "linux" | "windows" | "other";

export const detectPlatform = (): OnboardingPlatform => {
  if (typeof navigator === "undefined") {
    return "other";
  }
  const platform = (navigator.platform ?? "").toLowerCase();
  if (platform.includes("mac")) {
    return "macos";
  }
  if (platform.includes("win")) {
    return "windows";
  }
  if (platform.includes("linux")) {
    return "linux";
  }
  return "other";
};

export type OnboardingStepKey =
  | "welcome"
  | "tryItNow"
  | "models"
  | "llm"
  | "obsidian"
  | "mic"
  | "dictation"
  | "ready";

const ALL_STEPS: readonly OnboardingStepKey[] = [
  "welcome",
  "tryItNow",
  // Task #12b — Tier 1 models (Whisper Small + Silero VAD) must be on disk
  // before transcription works. The step surfaces the status and offers a
  // single "Скачать" CTA that pulls everything missing in sequence.
  "models",
  "llm",
  "obsidian",
  "mic",
  "dictation",
  "ready",
];

export const stepsForPlatform = (
  platform: OnboardingPlatform,
): readonly OnboardingStepKey[] => {
  if (platform === "macos") {
    return ALL_STEPS;
  }
  // Linux / Windows / other: only 5 cards — no mic/dictation permissions.
  return ALL_STEPS.filter((step) => step !== "mic" && step !== "dictation");
};

export const isRequiredStep = (step: OnboardingStepKey): boolean =>
  step === "welcome" || step === "tryItNow" || step === "models" || step === "ready";

import { FC, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { m, LazyMotion, domAnimation } from "framer-motion";
import { Check, ChevronRight, ExternalLink, Sparkles } from "lucide-react";

import Button from "../../components/Button";
import Card from "../../components/Card";
import { ROUTES } from "../../constants/routes";
import { useAudioPermissions, useLlmDetection, useObsidianDetection } from "./hooks";
import {
  detectPlatform,
  isRequiredStep,
  stepsForPlatform,
  type OnboardingStepKey,
} from "./OnboardingPlatform";
import {
  BrandMark,
  PageRoot,
  Title,
  Subtitle,
  SkipButton,
  StepDots,
  Dot,
  StepBody,
  StepTitle,
  StepHint,
  Toolbar,
} from "./Onboarding.style";

// Plan v0.8 Block 4 — platform-aware Onboarding:
// macOS: welcome → tryItNow → llm → obsidian → mic → dictation → ready
// Linux/Windows: welcome → tryItNow → llm → obsidian → ready

const ONBOARDING_COMPLETE_KEY = "mozgoslav.onboardingComplete";

const SYSTEM_PREFERENCES_URLS: Partial<Record<OnboardingStepKey, string>> = {
  mic: "x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone",
  dictation:
    "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility",
};

const PERMISSION_TEST_ID: Partial<Record<OnboardingStepKey, "mic" | "ax">> = {
  mic: "mic",
  dictation: "ax",
};

const Onboarding: FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const platform = useMemo(detectPlatform, []);
  const steps = useMemo(() => stepsForPlatform(platform), [platform]);
  const [index, setIndex] = useState(0);

  const currentStep = steps[index]!;
  const done = index >= steps.length - 1;
  const stepKey = `onboarding.${currentStep}` as const;

  // Autodetect hooks — each one is enabled only when the wizard is on the
  // matching card so the pollers do not fight each other.
  const { reachable } = useLlmDetection(currentStep === "llm");
  const obsidian = useObsidianDetection(currentStep === "obsidian");
  const permissions = useAudioPermissions(
    currentStep === "mic" || currentStep === "dictation",
  );

  const finish = () => {
    try {
      window.localStorage.setItem(ONBOARDING_COMPLETE_KEY, "true");
    } catch {
      // ignore — storage may be locked in tests, non-fatal.
    }
    navigate(ROUTES.dashboard, { replace: true });
  };

  const next = () => {
    if (done) {
      finish();
      return;
    }
    setIndex((i) => Math.min(steps.length - 1, i + 1));
  };

  const skip = () => {
    navigate(ROUTES.dashboard, { replace: true });
  };

  const showSkip = !isRequiredStep(currentStep);

  const systemPreferencesUrl = SYSTEM_PREFERENCES_URLS[currentStep];
  const permissionTestId = PERMISSION_TEST_ID[currentStep];

  const openSystemPreferences = () => {
    if (!systemPreferencesUrl) return;
    void window.open(systemPreferencesUrl, "_blank");
  };

  return (
    <PageRoot>
      <LazyMotion features={domAnimation} strict>
        {currentStep === "welcome" && (
          <m.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            data-testid="onboarding-brand"
          >
            <BrandMark>
              <Sparkles size={22} />
              {t("app.name")}
            </BrandMark>
          </m.div>
        )}

        <Title>{t("onboarding.title")}</Title>
        <Subtitle>{t("onboarding.subtitle")}</Subtitle>

        <Card>
          <m.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.18 }}
          >
            <StepBody>
              <StepTitle>{t(`${stepKey}.title` as const)}</StepTitle>
              <StepHint>{t(`${stepKey}.hint` as const)}</StepHint>

              {systemPreferencesUrl && permissionTestId && (
                <Button
                  data-testid={`onboarding-open-prefs-${permissionTestId}`}
                  variant="ghost"
                  rightIcon={<ExternalLink size={16} />}
                  onClick={openSystemPreferences}
                >
                  {t("onboarding.openSystemPreferences")}
                </Button>
              )}

              {currentStep === "llm" && (
                <div
                  data-testid="onboarding-llm-health"
                  data-reachable={reachable ? "true" : "false"}
                  style={{ marginTop: 12, fontSize: 14 }}
                >
                  {reachable
                    ? t("onboarding.llmReachable")
                    : t("onboarding.llmUnreachable")}
                </div>
              )}

              {currentStep === "obsidian" && obsidian.loaded && (
                <div data-testid="onboarding-obsidian-state" style={{ marginTop: 12, fontSize: 14 }}>
                  {obsidian.detected.length > 0
                    ? t("onboarding.obsidian.detected", { path: obsidian.detected[0]!.path })
                    : t("onboarding.obsidian.notDetected")}
                </div>
              )}

              {(currentStep === "mic" || currentStep === "dictation") && permissions.loaded && (
                <div
                  data-testid="onboarding-permissions-state"
                  style={{ marginTop: 12, fontSize: 14 }}
                >
                  {permissions.capabilities?.isSupported
                    ? t("onboarding.permissions.ready")
                    : t("onboarding.permissions.pending")}
                </div>
              )}
            </StepBody>
          </m.div>
        </Card>

        <StepDots>
          {steps.map((_, i) => (
            <Dot key={i} $active={i <= index} data-testid="onboarding-dot" />
          ))}
        </StepDots>

        <Toolbar>
          {showSkip ? (
            <SkipButton data-testid="onboarding-skip" type="button" onClick={skip}>
              {t("onboarding.skip")}
            </SkipButton>
          ) : (
            <span />
          )}
          <Button
            data-testid="onboarding-next"
            variant="primary"
            rightIcon={done ? <Check size={16} /> : <ChevronRight size={16} />}
            onClick={next}
          >
            {done ? t("common.apply") : t("common.next")}
          </Button>
        </Toolbar>
      </LazyMotion>
    </PageRoot>
  );
};

export default Onboarding;

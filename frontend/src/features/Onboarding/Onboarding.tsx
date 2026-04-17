import { FC, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { m, LazyMotion, domAnimation } from "framer-motion";
import { Check, ChevronRight, ExternalLink, Sparkles } from "lucide-react";

import Button from "../../components/Button";
import Card from "../../components/Card";
import { api } from "../../api/MozgoslavApi";
import { ROUTES } from "../../constants/routes";
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

// ADR-007 §D15 mandates this exact order:
//   Welcome → Models → Obsidian → LLM → Syncthing
//   → Mic → Accessibility → Input Monitoring → Ready.
type StepKey =
  | "welcome"
  | "models"
  | "obsidian"
  | "llm"
  | "syncthing"
  | "mic"
  | "accessibility"
  | "inputMonitoring"
  | "ready";

type StepDefinition = {
  readonly key: StepKey;
  readonly permissionTestId?: "mic" | "ax" | "input";
  readonly systemPreferencesUrl?: string;
};

const STEPS: readonly StepDefinition[] = [
  { key: "welcome" },
  { key: "models" },
  { key: "obsidian" },
  { key: "llm" },
  { key: "syncthing" },
  {
    key: "mic",
    permissionTestId: "mic",
    systemPreferencesUrl:
      "x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone",
  },
  {
    key: "accessibility",
    permissionTestId: "ax",
    systemPreferencesUrl:
      "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility",
  },
  {
    key: "inputMonitoring",
    permissionTestId: "input",
    systemPreferencesUrl:
      "x-apple.systempreferences:com.apple.preference.security?Privacy_ListenEvent",
  },
  { key: "ready" },
];

const TOTAL_STEPS = STEPS.length;

// Gate predicates per ADR-007 §D15. Skip bypasses every non-permission gate.
interface OnboardingGateState {
  llmReachable: boolean;
  hasModelFile: boolean;
  downloadComplete: boolean;
}

const ONBOARDING_COMPLETE_KEY = "mozgoslav.onboardingComplete";

const Onboarding: FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [gate, setGate] = useState<OnboardingGateState>({
    llmReachable: false,
    hasModelFile: false,
    downloadComplete: false,
  });

  const current = STEPS[step]!;
  const done = step >= TOTAL_STEPS - 1;

  const stepKey = useMemo(
    () => `onboarding.${current.key}` as const,
    [current],
  );

  // Poll LLM health every 3 s while the user is on the LLM step so we know
  // when Next can unlock (ADR-007 §D15).
  useEffect(() => {
    if (current.key !== "llm") return;
    let active = true;
    const poll = async () => {
      try {
        const reachable = await api.llmHealth();
        if (active) setGate((g) => ({ ...g, llmReachable: reachable }));
      } catch {
        if (active) setGate((g) => ({ ...g, llmReachable: false }));
      }
    };
    void poll();
    const handle = window.setInterval(poll, 3000);
    return () => {
      active = false;
      window.clearInterval(handle);
    };
  }, [current.key]);

  // Poll installed models while on the Models step — Next unlocks as soon as
  // the backend reports ≥ 1 installed model.
  useEffect(() => {
    if (current.key !== "models") return;
    let active = true;
    const poll = async () => {
      try {
        const models = await api.listModels();
        const hasInstalled = models.some((entry) => entry.installed);
        if (active) setGate((g) => ({ ...g, hasModelFile: hasInstalled }));
      } catch {
        // no-op, will retry
      }
    };
    void poll();
    const handle = window.setInterval(poll, 3000);
    return () => {
      active = false;
      window.clearInterval(handle);
    };
  }, [current.key]);

  const nextGate = (() => {
    if (current.key === "llm") return gate.llmReachable;
    if (current.key === "models") return gate.hasModelFile || gate.downloadComplete;
    return true;
  })();

  // Permission steps: Skip is hidden. Permissions are not optional per ADR-002.
  const showSkip = current.permissionTestId === undefined;

  const finish = () => {
    try {
      window.localStorage.setItem(ONBOARDING_COMPLETE_KEY, "true");
    } catch {
      // SSR / locked storage — not fatal; the user can revisit Settings.
    }
    navigate(ROUTES.dashboard, { replace: true });
  };

  const next = () => {
    if (!nextGate) return;
    if (done) {
      finish();
      return;
    }
    setStep((s) => Math.min(TOTAL_STEPS - 1, s + 1));
  };

  const skip = () => {
    navigate(ROUTES.dashboard, { replace: true });
  };

  const openSystemPreferences = () => {
    if (!current.systemPreferencesUrl) return;
    void window.open(current.systemPreferencesUrl, "_blank");
  };

  return (
    <PageRoot>
      <LazyMotion features={domAnimation} strict>
        {current.key === "welcome" && (
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
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.18 }}
          >
            <StepBody>
                <StepTitle>{t(`${stepKey}.title` as const)}</StepTitle>
                <StepHint>{t(`${stepKey}.hint` as const)}</StepHint>
                {current.systemPreferencesUrl && current.permissionTestId && (
                  <Button
                    data-testid={`onboarding-open-prefs-${current.permissionTestId}`}
                    variant="ghost"
                    rightIcon={<ExternalLink size={16} />}
                    onClick={openSystemPreferences}
                  >
                    {t("onboarding.openSystemPreferences")}
                  </Button>
                )}
                {current.key === "llm" && (
                  <div
                    data-testid="onboarding-llm-health"
                    data-reachable={gate.llmReachable ? "true" : "false"}
                    style={{ marginTop: 12, fontSize: 14 }}
                  >
                    {gate.llmReachable
                      ? t("onboarding.llmReachable")
                      : t("onboarding.llmUnreachable")}
                  </div>
                )}
                {current.key === "models" && (
                  <div
                    data-testid="onboarding-models-state"
                    data-hasfile={gate.hasModelFile ? "true" : "false"}
                    style={{ marginTop: 12, fontSize: 14 }}
                  >
                    {gate.hasModelFile
                      ? t("onboarding.modelsReady")
                      : t("onboarding.modelsMissing")}
                  </div>
                )}
            </StepBody>
          </m.div>
        </Card>

        <StepDots>
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <Dot key={i} $active={i <= step} data-testid="onboarding-dot" />
          ))}
        </StepDots>

        <Toolbar>
          {showSkip ? (
            <SkipButton
              data-testid="onboarding-skip"
              type="button"
              onClick={skip}
            >
              {t("onboarding.skip")}
            </SkipButton>
          ) : (
            <span />
          )}
          <Button
            data-testid="onboarding-next"
            variant="primary"
            rightIcon={done ? <Check size={16} /> : <ChevronRight size={16} />}
            disabled={!nextGate}
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

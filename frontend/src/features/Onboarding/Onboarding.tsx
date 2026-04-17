import { FC, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AnimatePresence, m, useReducedMotion } from "framer-motion";
import { Check, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";

import Button from "../../components/Button";
import Card from "../../components/Card";
import { api } from "../../api/MozgoslavApi";
import { ROUTES } from "../../constants/routes";
import {
  PageRoot,
  Title,
  Subtitle,
  StepDots,
  Dot,
  StepBody,
  StepTitle,
  StepHint,
  Toolbar,
  ToolbarGroup,
} from "./Onboarding.style";

type StepDefinition = {
  readonly key: string;
  readonly systemPreferencesUrl?: string;
};

// Order mirrors ADR-006 D-15.d: welcome+privacy → models → Obsidian → LLM →
// Syncthing pairing hint → mic / AX / Input-Monitoring permissions → done.
const STEPS: readonly StepDefinition[] = [
  { key: "step1" },
  { key: "step2" },
  { key: "step3" },
  { key: "step4" },
  { key: "syncthing" },
  { key: "step5", systemPreferencesUrl: "x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone" },
  { key: "step6", systemPreferencesUrl: "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility" },
  { key: "step7", systemPreferencesUrl: "x-apple.systempreferences:com.apple.preference.security?Privacy_ListenEvent" },
  { key: "step8" },
];

const markComplete = async (): Promise<void> => {
  try {
    const current = await api.getSettings();
    await api.saveSettings({ ...current, onboardingComplete: true });
  } catch {
    // Settings endpoint unreachable — stay silent. App.tsx has a fallback
    // check so the wizard doesn't re-trigger forever.
  }
};

const Onboarding: FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const [step, setStep] = useState(0);

  const done = step >= STEPS.length - 1;
  const current = STEPS[step]!;
  const stepKey = useMemo(() => `onboarding.${current.key}` as const, [current]);

  const finish = async () => {
    await markComplete();
    navigate(ROUTES.dashboard, { replace: true });
  };

  const next = () => {
    if (done) { void finish(); return; }
    setStep((s) => s + 1);
  };

  const openSystemPreferences = () => {
    if (current.systemPreferencesUrl) window.open(current.systemPreferencesUrl, "_blank");
  };

  return (
    <PageRoot>
      <Title>{t("onboarding.title")}</Title>
      <Subtitle>{t("onboarding.subtitle")}</Subtitle>

      <Card>
        <AnimatePresence mode="wait">
          <m.div
            key={step}
            initial={reduced ? false : { opacity: 0, x: 20 }}
            animate={reduced ? { opacity: 1 } : { opacity: 1, x: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, x: -20 }}
            transition={{ duration: reduced ? 0 : 0.18 }}
          >
            <StepBody>
              <StepTitle>{t(`${stepKey}.title` as const)}</StepTitle>
              <StepHint>{t(`${stepKey}.hint` as const)}</StepHint>
              {current.systemPreferencesUrl && (
                <Button
                  data-testid={`onboarding-open-prefs-${current.key}`}
                  variant="ghost"
                  rightIcon={<ExternalLink size={16} />}
                  onClick={openSystemPreferences}
                >
                  {t("onboarding.openSystemPreferences")}
                </Button>
              )}
            </StepBody>
          </m.div>
        </AnimatePresence>
      </Card>

      <StepDots>
        {STEPS.map((s, i) => <Dot key={s.key} $active={i <= step} />)}
      </StepDots>

      <Toolbar>
        <Button variant="ghost" onClick={() => void finish()}>
          {t("onboarding.skip")}
        </Button>
        <ToolbarGroup>
          <Button variant="ghost" leftIcon={<ChevronLeft size={16} />} onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
            {t("common.back")}
          </Button>
          <Button variant="primary" rightIcon={done ? <Check size={16} /> : <ChevronRight size={16} />} onClick={next}>
            {done ? t("common.apply") : t("common.next")}
          </Button>
        </ToolbarGroup>
      </Toolbar>
    </PageRoot>
  );
};

export default Onboarding;

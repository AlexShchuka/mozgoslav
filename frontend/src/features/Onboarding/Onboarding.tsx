import { FC, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronRight, ExternalLink } from "lucide-react";

import Button from "../../components/Button";
import Card from "../../components/Card";
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
} from "./Onboarding.style";

type StepDefinition = {
  readonly key: string;
  readonly systemPreferencesUrl?: string;
};

// Steps 1-4 mirror the original onboarding (language → models → obsidian → LLM).
// Steps 5-7 gate the push-to-talk dictation feature behind the three macOS
// permissions required by ADR-002 D5. Step 8 is the closing screen.
const STEPS: readonly StepDefinition[] = [
  { key: "step1" },
  { key: "step2" },
  { key: "step3" },
  { key: "step4" },
  {
    key: "step5",
    systemPreferencesUrl:
      "x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone",
  },
  {
    key: "step6",
    systemPreferencesUrl:
      "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility",
  },
  {
    key: "step7",
    systemPreferencesUrl:
      "x-apple.systempreferences:com.apple.preference.security?Privacy_ListenEvent",
  },
  { key: "step8" },
];

const TOTAL_STEPS = STEPS.length;

const Onboarding: FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  const done = step >= TOTAL_STEPS - 1;
  const current = STEPS[step]!;

  const stepKey = useMemo(() => `onboarding.${current.key}` as const, [current]);

  const next = () => {
    if (done) {
      navigate(ROUTES.dashboard, { replace: true });
      return;
    }
    setStep((s) => Math.min(TOTAL_STEPS - 1, s + 1));
  };

  const skip = () => navigate(ROUTES.dashboard, { replace: true });

  const openSystemPreferences = () => {
    if (!current.systemPreferencesUrl) return;
    void window.open(current.systemPreferencesUrl, "_blank");
  };

  return (
    <PageRoot>
      <Title>{t("onboarding.title")}</Title>
      <Subtitle>{t("onboarding.subtitle")}</Subtitle>

      <Card>
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.18 }}
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
          </motion.div>
        </AnimatePresence>
      </Card>

      <StepDots>
        {Array.from({ length: TOTAL_STEPS }, (_, i) => (
          <Dot key={i} $active={i <= step} />
        ))}
      </StepDots>

      <Toolbar>
        <Button variant="ghost" onClick={skip}>
          {t("onboarding.skip")}
        </Button>
        <Button
          variant="primary"
          rightIcon={done ? <Check size={16} /> : <ChevronRight size={16} />}
          onClick={next}
        >
          {done ? t("common.apply") : t("common.next")}
        </Button>
      </Toolbar>
    </PageRoot>
  );
};

export default Onboarding;

import React, { FC, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronRight } from "lucide-react";

import Button from "../../components/Button";
import Card from "../../components/Card";
import { ROUTES } from "../../constants/routes";
import {
  PageRoot, Title, Subtitle, StepDots, Dot, StepBody, StepTitle, StepHint, Toolbar,
} from "./Onboarding.style";

const TOTAL_STEPS = 5;

const Onboarding: FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  const done = step >= TOTAL_STEPS - 1;

  const stepKey = useMemo(() => `onboarding.step${step + 1}` as const, [step]);

  const next = () => {
    if (done) {
      navigate(ROUTES.dashboard, { replace: true });
      return;
    }
    setStep((s) => Math.min(TOTAL_STEPS - 1, s + 1));
  };

  const skip = () => navigate(ROUTES.dashboard, { replace: true });

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

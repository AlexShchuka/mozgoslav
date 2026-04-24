import { FC, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { domAnimation, LazyMotion, m } from "framer-motion";
import {
  Check,
  CheckCircle2,
  ChevronRight,
  Download,
  ExternalLink,
  PlayCircle,
  Sparkles,
} from "lucide-react";
import { toast } from "react-toastify";
import { useDispatch, useSelector } from "react-redux";
import type { Action, Dispatch } from "redux";

import Button from "../../components/Button";
import Card from "../../components/Card";
import ModelDownloadProgress from "../../components/ModelDownloadProgress";
import { ModelTier } from "../../api/gql/graphql";
import { ROUTES } from "../../constants/routes";
import { useAudioPermissions, useLlmDetection, useObsidianDetection } from "./hooks";
import {
  detectPlatform,
  isRequiredStep,
  type OnboardingStepKey,
  stepsForPlatform,
} from "./OnboardingPlatform";
import type { OnboardingProps } from "./types";
import {
  BrandMark,
  Dot,
  PageRoot,
  SkipButton,
  StepBody,
  StepDots,
  StepHint,
  StepTitle,
  Subtitle,
  Title,
  Toolbar,
} from "./Onboarding.style";
import {
  downloadModel,
  loadModels,
  selectActiveDownloads,
  selectAllModels,
} from "../../store/slices/models";

const SYSTEM_PREFERENCES_URLS: Partial<Record<OnboardingStepKey, string>> = {
  mic: "x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone",
  dictation: "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility",
};

const PERMISSION_TEST_ID: Partial<Record<OnboardingStepKey, "mic" | "ax">> = {
  mic: "mic",
  dictation: "ax",
};

const Onboarding: FC<OnboardingProps> = ({ currentStepIndex, onNextStep, onComplete }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch<Dispatch<Action>>();
  const platform = useMemo(detectPlatform, []);
  const steps = useMemo(() => stepsForPlatform(platform), [platform]);
  const [sampleImporting, setSampleImporting] = useState(false);
  const [downloadAllInFlight, setDownloadAllInFlight] = useState(false);

  const allModels = useSelector(selectAllModels);
  const activeDownloads = useSelector(selectActiveDownloads);
  const bundleModels = useMemo(
    () => allModels.filter((m) => m.tier === ModelTier.Bundle),
    [allModels]
  );

  const index = Math.max(0, Math.min(steps.length - 1, currentStepIndex));
  const currentStep = steps[index]!;
  const done = index >= steps.length - 1;
  const stepKey = `onboarding.${currentStep}` as const;

  const { reachable } = useLlmDetection(currentStep === "llm");
  const obsidian = useObsidianDetection(currentStep === "obsidian");
  const permissions = useAudioPermissions(currentStep === "mic" || currentStep === "dictation");

  const finish = () => {
    onComplete();
    navigate(ROUTES.dashboard, { replace: true });
  };

  const next = () => {
    if (done) {
      finish();
      return;
    }
    onNextStep(steps.length - 1);
  };

  const skip = () => {
    onComplete();
    navigate(ROUTES.dashboard, { replace: true });
  };

  useEffect(() => {
    if (currentStep !== "models") return;
    dispatch(loadModels());
  }, [currentStep, dispatch]);

  const handleDownloadAll = async (): Promise<void> => {
    if (downloadAllInFlight) return;
    const missing = bundleModels.filter((m) => !m.installed);
    if (missing.length === 0) return;
    setDownloadAllInFlight(true);
    try {
      for (const model of missing) {
        dispatch(downloadModel(model.id));
      }
    } finally {
      setDownloadAllInFlight(false);
    }
  };

  const missingBundleModels = bundleModels.filter((m) => !m.installed);
  const modelsBlockingNext = currentStep === "models" && missingBundleModels.length > 0;

  const showSkip = !isRequiredStep(currentStep);

  const systemPreferencesUrl = SYSTEM_PREFERENCES_URLS[currentStep];
  const permissionTestId = PERMISSION_TEST_ID[currentStep];

  const openSystemPreferences = () => {
    if (currentStep === "dictation") {
      void window.mozgoslav.requestAccessibility();
      return;
    }
    if (!systemPreferencesUrl) return;
    void window.mozgoslav.openExternal(systemPreferencesUrl);
  };

  const tryOnSample = async (): Promise<void> => {
    if (sampleImporting) return;
    setSampleImporting(true);
    try {
      toast.success(t("onboarding.tryItNow.sampleImported"));
      navigate(ROUTES.queue);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? t("onboarding.tryItNow.sampleFailed", { error: err.message })
          : t("onboarding.tryItNow.sampleFailed", { error: String(err) })
      );
    } finally {
      setSampleImporting(false);
    }
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

              {currentStep === "tryItNow" && (
                <Button
                  data-testid="onboarding-try-sample"
                  variant="primary"
                  leftIcon={<PlayCircle size={16} />}
                  disabled={sampleImporting}
                  onClick={tryOnSample}
                >
                  {sampleImporting
                    ? t("onboarding.tryItNow.sampleImporting")
                    : t("onboarding.tryItNow.trySample")}
                </Button>
              )}

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

              {currentStep === "models" && (
                <div
                  data-testid="onboarding-models-list"
                  style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 12 }}
                >
                  {bundleModels.map((model) => {
                    const activeDownloadId = activeDownloads[model.id] ?? null;
                    return (
                      <div key={model.id}>
                        <div
                          data-testid={`onboarding-models-item-${model.id}`}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 12,
                            fontSize: 14,
                          }}
                        >
                          <span>
                            <strong>{model.name}</strong>
                            {" · "}
                            {t("onboarding.models.sizeMb", { size: model.sizeMb })}
                          </span>
                          {model.installed ? (
                            <span
                              data-testid={`onboarding-models-installed-${model.id}`}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                color: "currentColor",
                                opacity: 0.7,
                              }}
                            >
                              <CheckCircle2 size={16} />
                              {t("onboarding.models.installed")}
                            </span>
                          ) : (
                            <span
                              data-testid={`onboarding-models-missing-${model.id}`}
                              style={{ opacity: 0.7 }}
                            >
                              {t("onboarding.models.missing")}
                            </span>
                          )}
                        </div>
                        {activeDownloadId && (
                          <ModelDownloadProgress downloadId={activeDownloadId} label={model.name} />
                        )}
                      </div>
                    );
                  })}
                  {missingBundleModels.length > 0 && (
                    <Button
                      data-testid="onboarding-models-download-all"
                      variant="primary"
                      leftIcon={<Download size={16} />}
                      disabled={downloadAllInFlight}
                      onClick={() => void handleDownloadAll()}
                    >
                      {downloadAllInFlight
                        ? t("onboarding.models.downloading")
                        : t("onboarding.models.downloadAll")}
                    </Button>
                  )}
                </div>
              )}

              {currentStep === "llm" && (
                <div
                  data-testid="onboarding-llm-health"
                  data-reachable={reachable ? "true" : "false"}
                  style={{ marginTop: 12, fontSize: 14 }}
                >
                  {reachable ? t("onboarding.llmReachable") : t("onboarding.llmUnreachable")}
                </div>
              )}

              {currentStep === "obsidian" && obsidian.loaded && (
                <div
                  data-testid="onboarding-obsidian-state"
                  style={{ marginTop: 12, fontSize: 14 }}
                >
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
            disabled={modelsBlockingNext}
          >
            {done ? t("common.apply") : t("common.next")}
          </Button>
        </Toolbar>
      </LazyMotion>
    </PageRoot>
  );
};

export default Onboarding;

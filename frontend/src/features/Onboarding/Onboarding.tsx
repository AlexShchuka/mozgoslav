import { FC, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { m, LazyMotion, domAnimation } from "framer-motion";
import { Check, CheckCircle2, ChevronRight, Download, ExternalLink, PlayCircle, Sparkles } from "lucide-react";
import { toast } from "react-toastify";

import Button from "../../components/Button";
import Card from "../../components/Card";
import ModelDownloadProgress from "../../components/ModelDownloadProgress";
import type { ModelEntry } from "../../domain/Model";
import { apiFactory } from "../../api";
import { ROUTES } from "../../constants/routes";
import { useAudioPermissions, useLlmDetection, useObsidianDetection } from "./hooks";
import {
  detectPlatform,
  isRequiredStep,
  stepsForPlatform,
  type OnboardingStepKey,
} from "./OnboardingPlatform";
import type { OnboardingProps } from "./types";
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

const SYSTEM_PREFERENCES_URLS: Partial<Record<OnboardingStepKey, string>> = {
  mic: "x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone",
  dictation:
    "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility",
};

const PERMISSION_TEST_ID: Partial<Record<OnboardingStepKey, "mic" | "ax">> = {
  mic: "mic",
  dictation: "ax",
};

// U1 — the try-it-now card offers a one-click import of this 30 s mono
// 16 kHz sine sample so the user hits a real ProcessedNote before
// installing an LLM, Obsidian, or granting mic permissions. The asset
// ships from `frontend/public/` so Vite serves it in dev and Electron
// copies it into the app bundle for packaged builds.
const SAMPLE_AUDIO_URL = "/sample.wav";
const SAMPLE_AUDIO_FILENAME = "mozgoslav-sample.wav";

const Onboarding: FC<OnboardingProps> = ({
  currentStepIndex,
  onNextStep,
  onComplete,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const platform = useMemo(detectPlatform, []);
  const steps = useMemo(() => stepsForPlatform(platform), [platform]);
  const [sampleImporting, setSampleImporting] = useState(false);
  const recordingApi = useMemo(() => apiFactory.createRecordingApi(), []);
  const modelsApi = useMemo(() => apiFactory.createModelsApi(), []);

  // Task #12b — Tier 1 bundle model status for the Models onboarding step.
  const [bundleModels, setBundleModels] = useState<ModelEntry[]>([]);
  const [activeDownloads, setActiveDownloads] = useState<Record<string, string>>({});
  const [downloadAllInFlight, setDownloadAllInFlight] = useState(false);
  const modelCompletionResolvers = useRef<Record<string, () => void>>({});

  const refreshBundleModels = useCallback(async () => {
    try {
      const all = await modelsApi.list();
      setBundleModels(all.filter((m) => m.tier === "bundle"));
    } catch (err) {
      toast.error(
        err instanceof Error
          ? t("onboarding.models.loadFailed", { error: err.message })
          : t("onboarding.models.loadFailed", { error: String(err) }),
      );
    }
  }, [modelsApi, t]);

  const handleModelDownloadComplete = useCallback((downloadId: string) => {
    setActiveDownloads((prev) => {
      const next: Record<string, string> = {};
      for (const [catalogueId, dId] of Object.entries(prev)) {
        if (dId !== downloadId) next[catalogueId] = dId;
        else modelCompletionResolvers.current[catalogueId]?.();
      }
      return next;
    });
  }, []);

  const handleDownloadAll = async (): Promise<void> => {
    if (downloadAllInFlight) return;
    const missing = bundleModels.filter((m) => !m.installed);
    if (missing.length === 0) return;
    setDownloadAllInFlight(true);
    try {
      for (const model of missing) {
        const { downloadId } = await modelsApi.download(model.id);
        setActiveDownloads((prev) => ({ ...prev, [model.id]: downloadId }));
        await new Promise<void>((resolve) => {
          modelCompletionResolvers.current[model.id] = resolve;
        });
        delete modelCompletionResolvers.current[model.id];
        await refreshBundleModels();
      }
    } catch (err) {
      toast.error(
        err instanceof Error
          ? t("onboarding.models.downloadFailed", { error: err.message })
          : t("onboarding.models.downloadFailed", { error: String(err) }),
      );
    } finally {
      setDownloadAllInFlight(false);
    }
  };
  // Clamp against the step list here — the reducer has no idea of the
  // platform and thus can't bound the index on its own.
  const index = Math.max(0, Math.min(steps.length - 1, currentStepIndex));

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
    // Skip must persist the completion flag so OnboardingCompleteGuard lets
    // the user into the dashboard on the next launch; without this the guard
    // bounced the user back here the moment they reloaded.
    onComplete();
    navigate(ROUTES.dashboard, { replace: true });
  };

  // If the store comes up already "completed" (second boot after onboarding),
  // bypass the wizard entirely and route straight to the dashboard.
  useEffect(() => {
    if (done && currentStepIndex >= steps.length - 1) return;
  }, [done, currentStepIndex, steps.length]);

  // Task #12b — load Tier 1 status when the user lands on the models step.
  useEffect(() => {
    if (currentStep !== "models") return;
    void refreshBundleModels();
  }, [currentStep, refreshBundleModels]);

  const missingBundleModels = bundleModels.filter((m) => !m.installed);
  const modelsBlockingNext = currentStep === "models" && missingBundleModels.length > 0;

  const showSkip = !isRequiredStep(currentStep);

  const systemPreferencesUrl = SYSTEM_PREFERENCES_URLS[currentStep];
  const permissionTestId = PERMISSION_TEST_ID[currentStep];

  const openSystemPreferences = () => {
    if (!systemPreferencesUrl) return;
    void window.open(systemPreferencesUrl, "_blank");
  };

  const tryOnSample = async (): Promise<void> => {
    if (sampleImporting) return;
    setSampleImporting(true);
    try {
      const response = await fetch(SAMPLE_AUDIO_URL);
      if (!response.ok) {
        throw new Error(`sample fetch failed (${response.status})`);
      }
      const blob = await response.blob();
      const file = new File([blob], SAMPLE_AUDIO_FILENAME, { type: "audio/wav" });
      await recordingApi.upload([file]);
      toast.success(t("onboarding.tryItNow.sampleImported"));
      navigate(ROUTES.queue);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? t("onboarding.tryItNow.sampleFailed", { error: err.message })
          : t("onboarding.tryItNow.sampleFailed", { error: String(err) }),
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
                <div data-testid="onboarding-models-list" style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 12 }}>
                  {bundleModels.map((model) => (
                    <div
                      key={model.id}
                      data-testid={`onboarding-models-item-${model.id}`}
                      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, fontSize: 14 }}
                    >
                      <span>
                        <strong>{model.name}</strong>
                        {" · "}
                        {t("onboarding.models.sizeMb", { size: model.sizeMb })}
                      </span>
                      {model.installed ? (
                        <span
                          data-testid={`onboarding-models-installed-${model.id}`}
                          style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "currentColor", opacity: 0.7 }}
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
                  ))}
                  {Object.entries(activeDownloads).map(([catalogueId, downloadId]) => (
                    <ModelDownloadProgress
                      key={downloadId}
                      downloadId={downloadId}
                      label={bundleModels.find((m) => m.id === catalogueId)?.name ?? catalogueId}
                      onComplete={handleModelDownloadComplete}
                    />
                  ))}
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

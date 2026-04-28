import { FC, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  FolderTree,
  LayoutTemplate,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

import Button from "../../components/Button";
import Card from "../../components/Card";
import { AppSettings, DEFAULT_SETTINGS } from "../../domain/Settings";
import type { CheckSeverity } from "../../domain/obsidian/types";
import type { ObsidianProps } from "./types";
import {
  ButtonRow,
  DiagnosticsChip,
  DiagnosticsChipMessage,
  DiagnosticsChipTitle,
  DiagnosticsGrid,
  EmptyStateBanner,
  ErrorMessage,
  FolderHint,
  PageRoot,
  PageTitle,
  StepBadge,
  StepItem,
  Stepper,
  Subtitle,
  VaultRow,
} from "./Obsidian.style";

const WIZARD_STEPS = [1, 2, 3, 4, 5] as const;

const Obsidian: FC<ObsidianProps> = ({
  settings: loadedSettings,
  isSetupInProgress,
  diagnostics,
  isDiagnosticsLoading,
  diagnosticsError,
  isReapplyingBootstrap,
  isReinstallingPlugins,
  wizardCurrentStep,
  wizardNextStep,
  wizardIsStepRunning,
  wizardIsComplete,
  wizardError,
  onLoadSettings,
  onSaveSettings,
  onSetup,
  onFetchDiagnostics,
  onReapplyBootstrap,
  onReinstallPlugins,
  onRunWizardStep,
}) => {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<AppSettings>(loadedSettings ?? DEFAULT_SETTINGS);

  useEffect(() => {
    onLoadSettings();
  }, [onLoadSettings]);

  useEffect(() => {
    onFetchDiagnostics();
  }, [onFetchDiagnostics]);

  useEffect(() => {
    if (loadedSettings) setSettings(loadedSettings);
  }, [loadedSettings]);

  const pickVault = async () => {
    if (!window.mozgoslav) return;
    const res = await window.mozgoslav.openFolder();
    if (!res.canceled && res.filePaths[0]) {
      const updated = { ...settings, vaultPath: res.filePaths[0] };
      setSettings(updated);
      onSaveSettings(updated);
    }
  };

  const applySetup = () => {
    if (!settings.vaultPath) {
      toast.warning(t("settings.fields.vaultPath"));
      return;
    }
    onSetup(settings.vaultPath);
  };

  const vaultMissing = !settings.vaultPath;
  const vaultOk = diagnostics?.vault.ok ?? false;
  const showWizard = !vaultOk;

  return (
    <PageRoot>
      <div>
        <PageTitle>{t("obsidian.title")}</PageTitle>
        <Subtitle>{t("obsidian.setupHint")}</Subtitle>
      </div>

      {vaultMissing && (
        <EmptyStateBanner data-testid="obsidian-empty-state">
          <AlertTriangle size={18} />
          <div>
            <strong>{t("obsidian.emptyState.vault-not-configured")}</strong>
            <FolderHint>{t("obsidian.emptyState.vaultHint")}</FolderHint>
          </div>
        </EmptyStateBanner>
      )}

      <Card title={t("settings.fields.vaultPath")}>
        <VaultRow>
          <code>{settings.vaultPath || "—"}</code>
          <Button variant="secondary" onClick={pickVault}>
            {t("common.add")}
          </Button>
        </VaultRow>
      </Card>

      {showWizard ? (
        <Card title={t("obsidian.wizard.title")} subtitle={t("obsidian.wizard.subtitle")}>
          <Stepper data-testid="obsidian-wizard-stepper">
            {WIZARD_STEPS.map((step) => {
              const state =
                step < wizardCurrentStep
                  ? "done"
                  : step === wizardCurrentStep
                    ? "active"
                    : "pending";
              return (
                <StepItem
                  key={step}
                  $state={state}
                  data-testid={`obsidian-wizard-step-${step}`}
                  data-state={state}
                >
                  <StepBadge>{state === "done" ? <CheckCircle2 size={14} /> : step}</StepBadge>
                  <span>{t(`obsidian.wizard.step.${step}` as const)}</span>
                </StepItem>
              );
            })}
          </Stepper>
          {wizardError && (
            <ErrorMessage data-testid="obsidian-wizard-error">{wizardError}</ErrorMessage>
          )}
          <ButtonRow>
            <Button
              variant="primary"
              leftIcon={<ChevronRight size={16} />}
              isLoading={wizardIsStepRunning}
              disabled={wizardIsStepRunning || wizardIsComplete || !settings.vaultPath}
              onClick={() => onRunWizardStep(wizardNextStep ?? wizardCurrentStep)}
              data-testid="obsidian-wizard-run"
            >
              {wizardIsComplete
                ? t("obsidian.wizard.complete")
                : t("obsidian.wizard.runStep", { step: wizardNextStep ?? wizardCurrentStep })}
            </Button>
            <Button
              variant="secondary"
              leftIcon={<FolderTree size={16} />}
              isLoading={isSetupInProgress}
              onClick={applySetup}
              disabled={!settings.vaultPath || isSetupInProgress}
              data-testid="obsidian-setup"
            >
              {t("obsidian.applyButton")}
            </Button>
          </ButtonRow>
          <FolderHint>{t("obsidian.wizard.hint")}</FolderHint>
        </Card>
      ) : (
        <Card title={t("obsidian.diagnostics.title")} subtitle={t("obsidian.diagnostics.subtitle")}>
          <ButtonRow>
            <Button
              variant="secondary"
              leftIcon={<RefreshCw size={16} />}
              isLoading={isDiagnosticsLoading}
              onClick={onFetchDiagnostics}
              data-testid="obsidian-refresh-diagnostics"
            >
              {t("obsidian.diagnostics.refresh")}
            </Button>
            <Button
              variant="secondary"
              leftIcon={<ShieldCheck size={16} />}
              isLoading={isReapplyingBootstrap}
              disabled={!settings.vaultPath || isReapplyingBootstrap}
              onClick={onReapplyBootstrap}
              data-testid="obsidian-reapply-bootstrap"
            >
              {t("obsidian.diagnostics.reapplyBootstrap")}
            </Button>
            <Button
              variant="secondary"
              leftIcon={<LayoutTemplate size={16} />}
              isLoading={isReinstallingPlugins}
              disabled={!settings.vaultPath || isReinstallingPlugins}
              onClick={onReinstallPlugins}
              data-testid="obsidian-reinstall-plugins"
            >
              {t("obsidian.diagnostics.reinstallPlugins")}
            </Button>
          </ButtonRow>
          {diagnosticsError && (
            <ErrorMessage data-testid="obsidian-diagnostics-error">{diagnosticsError}</ErrorMessage>
          )}
          {diagnostics && (
            <DiagnosticsGrid data-testid="obsidian-diagnostics-grid">
              <Chip
                label={t("obsidian.diagnostics.vault")}
                severity={diagnostics.vault.severity}
                message={diagnostics.vault.message}
              />
              <Chip
                label={t("obsidian.diagnostics.templater")}
                severity={diagnostics.templater.severity}
                message={diagnostics.templater.message}
              />
              <Chip
                label={t("obsidian.diagnostics.bootstrap")}
                severity={diagnostics.bootstrap.severity}
                message={diagnostics.bootstrap.message}
              />
              <Chip
                label={t("obsidian.diagnostics.restApi")}
                severity={diagnostics.restApi.severity}
                message={diagnostics.restApi.message}
              />
              <Chip
                label={t("obsidian.diagnostics.lmStudio")}
                severity={diagnostics.lmStudio.severity}
                message={diagnostics.lmStudio.message}
              />
              <Chip
                label={t("obsidian.diagnostics.plugins")}
                severity={mergePluginSeverity(diagnostics.plugins.map((p) => p.severity))}
                message={t("obsidian.diagnostics.pluginsCount", {
                  total: diagnostics.plugins.length,
                  installed: diagnostics.plugins.filter((p) => p.installed).length,
                })}
              />
            </DiagnosticsGrid>
          )}
        </Card>
      )}
    </PageRoot>
  );
};

const Chip: FC<{ label: string; severity: CheckSeverity; message: string }> = ({
  label,
  severity,
  message,
}) => (
  <DiagnosticsChip $severity={severity} data-testid={`obsidian-chip-${severity}`}>
    <DiagnosticsChipTitle>
      {severity === "OK" ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
      {label}
    </DiagnosticsChipTitle>
    <DiagnosticsChipMessage>{message}</DiagnosticsChipMessage>
  </DiagnosticsChip>
);

const mergePluginSeverity = (severities: readonly CheckSeverity[]): CheckSeverity => {
  if (severities.includes("ERROR")) return "ERROR";
  if (severities.includes("WARNING")) return "WARNING";
  if (severities.includes("ADVISORY")) return "ADVISORY";
  return "OK";
};

export default Obsidian;

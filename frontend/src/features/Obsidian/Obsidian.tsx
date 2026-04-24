import { FC, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  FolderTree,
  LayoutTemplate,
  RefreshCw,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";

import Button from "../../components/Button";
import Card from "../../components/Card";
import { AppSettings, DEFAULT_SETTINGS } from "../../domain/Settings";
import type { CheckSeverity } from "../../api/ObsidianApi";
import type { ObsidianProps } from "./types";
import {
  BulkButtonRow,
  DiagnosticsChip,
  DiagnosticsChipMessage,
  DiagnosticsChipTitle,
  DiagnosticsGrid,
  EmptyStateBanner,
  FolderGrid,
  FolderHint,
  FolderItem,
  PageRoot,
  PageTitle,
  Subtitle,
  VaultRow,
} from "./Obsidian.style";

const PRESET_FOLDERS = [
  { key: "_inbox", required: true },
  { key: "People", required: false },
  { key: "Projects", required: false },
  { key: "Topics", required: false },
  { key: "Archive", required: false },
  { key: "Templates", required: false },
] as const;

const Obsidian: FC<ObsidianProps> = ({
  settings: loadedSettings,
  isBulkExporting,
  isApplyingLayout,
  isSetupInProgress,
  diagnostics,
  isDiagnosticsLoading,
  diagnosticsError,
  isReapplyingBootstrap,
  isReinstallingPlugins,
  onLoadSettings,
  onSaveSettings,
  onSetup,
  onBulkExport,
  onApplyLayout,
  onFetchDiagnostics,
  onReapplyBootstrap,
  onReinstallPlugins,
}) => {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<AppSettings>(loadedSettings ?? DEFAULT_SETTINGS);
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(PRESET_FOLDERS.filter((f) => f.required).map((f) => f.key))
  );

  useEffect(() => {
    onLoadSettings();
  }, [onLoadSettings]);

  useEffect(() => {
    onFetchDiagnostics();
  }, [onFetchDiagnostics]);

  useEffect(() => {
    if (loadedSettings) setSettings(loadedSettings);
  }, [loadedSettings]);

  const toggle = (key: string, required: boolean) => {
    if (required) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

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

  const selectedArray = useMemo(() => Array.from(selected), [selected]);

  const vaultMissing = !settings.vaultPath;

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

      <Card title={t("obsidian.bulkExportTitle")} subtitle={t("obsidian.bulkExportHint")}>
        <BulkButtonRow>
          <Button
            variant="primary"
            leftIcon={<UploadCloud size={16} />}
            data-testid="obsidian-sync-all"
            isLoading={isBulkExporting}
            disabled={isBulkExporting}
            onClick={onBulkExport}
          >
            {t("obsidian.syncAll")}
          </Button>
          <Button
            variant="secondary"
            leftIcon={<LayoutTemplate size={16} />}
            data-testid="obsidian-apply-layout"
            isLoading={isApplyingLayout}
            disabled={isApplyingLayout}
            onClick={onApplyLayout}
          >
            {t("obsidian.applyLayout")}
          </Button>
        </BulkButtonRow>
      </Card>

      <Card title={t("obsidian.setupTitle")} subtitle={t("obsidian.setupHint")}>
        <FolderGrid>
          {PRESET_FOLDERS.map(({ key, required }) => {
            const active = selected.has(key);
            return (
              <FolderItem
                key={key}
                type="button"
                $active={active}
                $required={required}
                onClick={() => toggle(key, required)}
              >
                {active ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                <div>
                  <strong>{t(`obsidian.folders.${key}` as const)}</strong>
                  {required && <FolderHint>{t("common.yes")} · обязательно</FolderHint>}
                </div>
              </FolderItem>
            );
          })}
        </FolderGrid>
        <FolderHint>{t("obsidian.templateHint")}</FolderHint>
        <div style={{ marginTop: 16 }}>
          <Button
            variant="primary"
            leftIcon={<FolderTree size={16} />}
            isLoading={isSetupInProgress}
            onClick={applySetup}
            disabled={!settings.vaultPath || selectedArray.length === 0}
          >
            {t("obsidian.applyButton")}
          </Button>
        </div>
      </Card>

      <Card title={t("obsidian.diagnostics.title")} subtitle={t("obsidian.diagnostics.subtitle")}>
        <BulkButtonRow>
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
            disabled={!settings.vaultPath}
            onClick={onReapplyBootstrap}
            data-testid="obsidian-reapply-bootstrap"
          >
            {t("obsidian.diagnostics.reapplyBootstrap")}
          </Button>
          <Button
            variant="secondary"
            leftIcon={<LayoutTemplate size={16} />}
            isLoading={isReinstallingPlugins}
            disabled={!settings.vaultPath}
            onClick={onReinstallPlugins}
            data-testid="obsidian-reinstall-plugins"
          >
            {t("obsidian.diagnostics.reinstallPlugins")}
          </Button>
        </BulkButtonRow>
        {diagnosticsError && (
          <FolderHint data-testid="obsidian-diagnostics-error">{diagnosticsError}</FolderHint>
        )}
        {diagnostics && (
          <DiagnosticsGrid data-testid="obsidian-diagnostics-grid">
            <Chip
              label={t("obsidian.diagnostics.vault")}
              severity={diagnostics.vault.severity}
              message={diagnostics.vault.message}
            />
            {diagnostics.plugins.map((plugin) => (
              <Chip
                key={plugin.pluginId}
                label={plugin.pluginId}
                severity={plugin.severity}
                message={plugin.message}
              />
            ))}
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
          </DiagnosticsGrid>
        )}
      </Card>
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
      {severity === "Ok" ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
      {label}
    </DiagnosticsChipTitle>
    <DiagnosticsChipMessage>{message}</DiagnosticsChipMessage>
  </DiagnosticsChip>
);

export default Obsidian;

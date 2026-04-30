import { FC } from "react";
import { useTranslation } from "react-i18next";
import { RefreshCw } from "lucide-react";

import Badge from "../../components/Badge";
import Button from "../../components/Button";
import type {
  LlmRuntimeState,
  SupervisorServiceState,
  SyncthingRuntimeState,
} from "../../api/gql/graphql";
import type { MonitoringProps } from "./types";
import {
  EmptyState,
  ErrorText,
  FieldLabel,
  FieldRow,
  FieldValue,
  LoadingText,
  MonitoringHeader,
  MonitoringRoot,
  MonitoringTitle,
  Panel,
  PanelGrid,
  PanelTitle,
  ServiceMeta,
  ServiceName,
  ServiceRow,
  StatusIndicator,
} from "./Monitoring.style";

const Monitoring: FC<MonitoringProps> = ({
  runtimeState,
  isLoading,
  isReprobing,
  error,
  onReprobe,
}) => {
  const { t } = useTranslation();

  return (
    <MonitoringRoot data-testid="monitoring-root">
      <MonitoringHeader>
        <MonitoringTitle>{t("monitoring.title")}</MonitoringTitle>
        <Button
          variant="secondary"
          leftIcon={<RefreshCw size={16} />}
          onClick={onReprobe}
          isLoading={isReprobing}
          disabled={isReprobing}
          data-testid="monitoring-reprobe-btn"
        >
          {t("monitoring.actions.reprobe")}
        </Button>
      </MonitoringHeader>

      {isLoading && !runtimeState && (
        <LoadingText data-testid="monitoring-loading">{t("common.loading")}</LoadingText>
      )}

      {error && !runtimeState && <ErrorText data-testid="monitoring-error">{error}</ErrorText>}

      {runtimeState && (
        <PanelGrid>
          <LlmPanel llm={runtimeState.llm} t={t} />
          <SyncthingPanel syncthing={runtimeState.syncthing} t={t} />
          <ServicesPanel services={runtimeState.services} t={t} />
        </PanelGrid>
      )}

      {!runtimeState && !isLoading && !error && (
        <EmptyState data-testid="monitoring-empty">{t("common.empty")}</EmptyState>
      )}
    </MonitoringRoot>
  );
};

interface LlmPanelProps {
  llm: LlmRuntimeState;
  t: ReturnType<typeof useTranslation>["t"];
}

const LlmPanel: FC<LlmPanelProps> = ({ llm, t }) => (
  <Panel data-testid="monitoring-llm-panel">
    <PanelTitle>
      <StatusIndicator $online={llm.online} /> {t("monitoring.llm.title")}
    </PanelTitle>
    <FieldRow>
      <FieldLabel>{t("monitoring.llm.endpoint")}</FieldLabel>
      <FieldValue>{llm.endpoint || "—"}</FieldValue>
    </FieldRow>
    <FieldRow>
      <FieldLabel>{t("monitoring.llm.status")}</FieldLabel>
      <FieldValue>
        <Badge tone={llm.online ? "success" : "error"}>
          {llm.online ? t("monitoring.llm.online") : t("monitoring.llm.offline")}
        </Badge>
      </FieldValue>
    </FieldRow>
    <FieldRow>
      <FieldLabel>{t("monitoring.llm.model")}</FieldLabel>
      <FieldValue>{llm.model || "—"}</FieldValue>
    </FieldRow>
    <FieldRow>
      <FieldLabel>{t("monitoring.llm.contextLength")}</FieldLabel>
      <FieldValue>{llm.contextLength > 0 ? llm.contextLength.toLocaleString() : "—"}</FieldValue>
    </FieldRow>
    <FieldRow>
      <FieldLabel>{t("monitoring.llm.capabilities")}</FieldLabel>
      <FieldValue>
        {llm.supportsToolCalling && <Badge tone="info">{t("monitoring.llm.toolCalling")}</Badge>}{" "}
        {llm.supportsJsonMode && <Badge tone="info">{t("monitoring.llm.jsonMode")}</Badge>}
      </FieldValue>
    </FieldRow>
    {llm.lastError && (
      <FieldRow>
        <FieldLabel>{t("monitoring.llm.lastError")}</FieldLabel>
        <FieldValue>
          <ErrorText>{llm.lastError}</ErrorText>
        </FieldValue>
      </FieldRow>
    )}
  </Panel>
);

interface SyncthingPanelProps {
  syncthing: SyncthingRuntimeState;
  t: ReturnType<typeof useTranslation>["t"];
}

const SyncthingPanel: FC<SyncthingPanelProps> = ({ syncthing, t }) => {
  const detected = syncthing.detection !== "not_found" && syncthing.detection !== "none";
  return (
    <Panel data-testid="monitoring-syncthing-panel">
      <PanelTitle>
        <StatusIndicator $online={detected} /> {t("monitoring.syncthing.title")}
      </PanelTitle>
      <FieldRow>
        <FieldLabel>{t("monitoring.syncthing.detection")}</FieldLabel>
        <FieldValue>
          <Badge tone={detected ? "success" : "neutral"}>{syncthing.detection}</Badge>
        </FieldValue>
      </FieldRow>
      {syncthing.version && (
        <FieldRow>
          <FieldLabel>{t("monitoring.syncthing.version")}</FieldLabel>
          <FieldValue>{syncthing.version}</FieldValue>
        </FieldRow>
      )}
      {syncthing.binaryPath && (
        <FieldRow>
          <FieldLabel>{t("monitoring.syncthing.binaryPath")}</FieldLabel>
          <FieldValue>{syncthing.binaryPath}</FieldValue>
        </FieldRow>
      )}
      {syncthing.apiUrl && (
        <FieldRow>
          <FieldLabel>{t("monitoring.syncthing.apiUrl")}</FieldLabel>
          <FieldValue>{syncthing.apiUrl}</FieldValue>
        </FieldRow>
      )}
      {syncthing.hint && (
        <FieldRow>
          <FieldLabel>{t("monitoring.syncthing.hint")}</FieldLabel>
          <FieldValue>{syncthing.hint}</FieldValue>
        </FieldRow>
      )}
    </Panel>
  );
};

interface ServicesPanelProps {
  services: readonly SupervisorServiceState[];
  t: ReturnType<typeof useTranslation>["t"];
}

const ServicesPanel: FC<ServicesPanelProps> = ({ services, t }) => (
  <Panel data-testid="monitoring-services-panel">
    <PanelTitle>{t("monitoring.services.title")}</PanelTitle>
    {services.length === 0 && <LoadingText>{t("monitoring.services.empty")}</LoadingText>}
    {services.map((svc) => {
      const isRunning = svc.state === "running";
      return (
        <ServiceRow key={svc.name} data-testid={`monitoring-service-${svc.name}`}>
          <StatusIndicator $online={isRunning} />
          <ServiceName>{svc.name}</ServiceName>
          <Badge tone={isRunning ? "success" : svc.state === "stopped" ? "neutral" : "warning"}>
            {svc.state}
          </Badge>
          <ServiceMeta>
            {svc.pid != null && `PID ${svc.pid}`}
            {svc.port != null && ` :${svc.port}`}
            {svc.restartCount > 0 &&
              ` (${t("monitoring.services.restarts", { n: svc.restartCount })})`}
          </ServiceMeta>
          {svc.lastError && <ErrorText>{svc.lastError}</ErrorText>}
        </ServiceRow>
      );
    })}
  </Panel>
);

export default Monitoring;

import { FC, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom";
import type { Action, Dispatch } from "redux";
import { Check, Download, HardDrive } from "lucide-react";

import Badge from "../../components/Badge";
import Button from "../../components/Button";
import Card from "../../components/Card";
import EmptyState from "../../components/EmptyState";
import ModelDownloadProgress from "../../components/ModelDownloadProgress";
import { ModelKind } from "../../api/gql/graphql";
import {
  downloadModel,
  loadModels,
  selectAllModels,
  selectActiveDownloadIdForModel,
  selectDownloadingModelId,
} from "../../store/slices/models";
import {
  FilterChip,
  FilterRow,
  GroupHeading,
  ModelCard,
  ModelHeader,
  ModelMeta,
  PageRoot,
  PageTitle,
  Subtitle,
} from "./Models.style";

const KIND_FILTER_VALUES = [
  ModelKind.Stt,
  ModelKind.Llm,
  ModelKind.Vad,
  ModelKind.AudioMl,
  ModelKind.NlpMl,
] as const;

type FilterValue = typeof KIND_FILTER_VALUES[number] | "all";

const Models: FC = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch<Dispatch<Action>>();
  const models = useSelector(selectAllModels);
  const requestingDownloadId = useSelector(selectDownloadingModelId);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    dispatch(loadModels());
  }, [dispatch]);

  const rawType = searchParams.get("type");
  const activeFilter: FilterValue = KIND_FILTER_VALUES.includes(rawType as ModelKind)
    ? (rawType as ModelKind)
    : "all";

  const setFilter = useCallback(
    (value: FilterValue) => {
      if (value === "all") {
        setSearchParams({});
      } else {
        setSearchParams({ type: value });
      }
    },
    [setSearchParams]
  );

  const filteredModels =
    activeFilter === "all" ? models : models.filter((m) => m.kind === activeFilter);

  const groupedByKind = KIND_FILTER_VALUES.reduce<Record<string, typeof models>>(
    (acc, kind) => {
      acc[kind] = filteredModels.filter((m) => m.kind === kind);
      return acc;
    },
    {}
  );

  const nonEmptyKinds = KIND_FILTER_VALUES.filter((k) => (groupedByKind[k]?.length ?? 0) > 0);

  return (
    <PageRoot>
      <div>
        <PageTitle>{t("models.title")}</PageTitle>
        <Subtitle>{t("models.subtitle")}</Subtitle>
      </div>
      <FilterRow>
        <FilterChip
          active={activeFilter === "all"}
          onClick={() => setFilter("all")}
          data-testid="model-filter-all"
        >
          {t("models.filter.all")}
        </FilterChip>
        {KIND_FILTER_VALUES.map((kind) => (
          <FilterChip
            key={kind}
            active={activeFilter === kind}
            onClick={() => setFilter(kind)}
            data-testid={`model-filter-${kind}`}
          >
            {t(`models.filter.${kind}`)}
          </FilterChip>
        ))}
      </FilterRow>
      {filteredModels.length === 0 ? (
        <EmptyState title={t("common.empty")} icon={<HardDrive size={28} />} />
      ) : (
        nonEmptyKinds.map((kind) => (
          <div key={kind}>
            <GroupHeading>{t(`models.filter.${kind}`)}</GroupHeading>
            {groupedByKind[kind].map((model) => (
              <ModelRow
                key={model.id}
                modelId={model.id}
                modelName={model.name}
                modelDescription={model.description}
                modelSizeMb={model.sizeMb}
                modelDestinationPath={model.destinationPath}
                modelInstalled={model.installed}
                modelIsDefault={model.isDefault}
                requestingDownloadId={requestingDownloadId}
                onDownload={() => dispatch(downloadModel(model.id))}
              />
            ))}
          </div>
        ))
      )}
    </PageRoot>
  );
};

interface ModelRowProps {
  modelId: string;
  modelName: string;
  modelDescription: string | null | undefined;
  modelSizeMb: number;
  modelDestinationPath: string;
  modelInstalled: boolean;
  modelIsDefault: boolean;
  requestingDownloadId: string | null;
  onDownload: () => void;
}

const ModelRow: FC<ModelRowProps> = ({
  modelId,
  modelName,
  modelDescription,
  modelSizeMb,
  modelDestinationPath,
  modelInstalled,
  modelIsDefault,
  requestingDownloadId,
  onDownload,
}) => {
  const { t } = useTranslation();
  const activeDownloadId = useSelector(selectActiveDownloadIdForModel(modelId));

  return (
    <ModelCard>
      <Card
        title={
          <ModelHeader>
            <span>{modelName}</span>
            {modelIsDefault && <Badge tone="accent">{t("profiles.defaultBadge")}</Badge>}
            {modelInstalled ? (
              <Badge tone="success">{t("models.installed")}</Badge>
            ) : (
              <Badge tone="neutral">{t("models.notInstalled")}</Badge>
            )}
          </ModelHeader>
        }
        subtitle={modelDescription}
        headerAction={
          modelInstalled ? (
            <Button variant="success" disabled leftIcon={<Check size={16} />}>
              {t("models.installedButton")}
            </Button>
          ) : (
            <Button
              variant="primary"
              leftIcon={<Download size={16} />}
              isLoading={requestingDownloadId === modelId}
              onClick={onDownload}
            >
              {t("models.download")}
            </Button>
          )
        }
      >
        <ModelMeta>
          <span>{t("models.sizeMb", { size: modelSizeMb })}</span>
          <code>{modelDestinationPath}</code>
        </ModelMeta>
        {activeDownloadId && (
          <div>
            <ModelDownloadProgress downloadId={activeDownloadId} label={modelName} />
          </div>
        )}
      </Card>
    </ModelCard>
  );
};

export default Models;

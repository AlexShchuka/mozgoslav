import { FC, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import type { Action, Dispatch } from "redux";
import { Check, Download, HardDrive } from "lucide-react";

import Badge from "../../components/Badge";
import Button from "../../components/Button";
import Card from "../../components/Card";
import EmptyState from "../../components/EmptyState";
import ModelDownloadProgress from "../../components/ModelDownloadProgress";
import {
  downloadModel,
  loadModels,
  selectAllModels,
  selectActiveDownloadIdForModel,
  selectDownloadingModelId,
} from "../../store/slices/models";
import { ModelCard, ModelHeader, ModelMeta, PageRoot, PageTitle, Subtitle } from "./Models.style";

const Models: FC = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch<Dispatch<Action>>();
  const models = useSelector(selectAllModels);
  const requestingDownloadId = useSelector(selectDownloadingModelId);

  useEffect(() => {
    dispatch(loadModels());
  }, [dispatch]);

  return (
    <PageRoot>
      <div>
        <PageTitle>{t("models.title")}</PageTitle>
        <Subtitle>{t("models.subtitle")}</Subtitle>
      </div>
      {models.length === 0 ? (
        <EmptyState title={t("common.empty")} icon={<HardDrive size={28} />} />
      ) : (
        models.map((model) => (
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

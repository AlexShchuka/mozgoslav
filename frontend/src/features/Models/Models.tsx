import { FC, useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { Check, Download, HardDrive } from "lucide-react";

import Badge from "../../components/Badge";
import Button from "../../components/Button";
import Card from "../../components/Card";
import EmptyState from "../../components/EmptyState";
import ModelDownloadProgress from "../../components/ModelDownloadProgress";
import { apiFactory } from "../../api";
import { ModelEntry } from "../../domain/Model";

const modelsApi = apiFactory.createModelsApi();
import { PageRoot, PageTitle, Subtitle, ModelCard, ModelMeta, ModelHeader } from "./Models.style";

const Models: FC = () => {
  const { t } = useTranslation();
  const [models, setModels] = useState<ModelEntry[]>([]);
  const [downloading, setDownloading] = useState<string | null>(null);
  // Task #13 — catalogueId → downloadId for in-flight transfers so we can
  // mount <ModelDownloadProgress/> underneath the row and surface bytes /
  // total. Previously clicking Download gave no visual feedback until the
  // 1.5 GB GET finished, which reads as "nothing happens" for the user.
  const [activeDownloads, setActiveDownloads] = useState<Record<string, string>>({});

  const refresh = useCallback(async () => {
    try {
      setModels(await modelsApi.list());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleDownloadComplete = useCallback(
    (downloadId: string) => {
      setActiveDownloads((prev) => {
        const next: Record<string, string> = {};
        for (const [id, dId] of Object.entries(prev)) {
          if (dId !== downloadId) next[id] = dId;
        }
        return next;
      });
      void refresh();
    },
    [refresh],
  );

  const handleDownload = async (id: string) => {
    setDownloading(id);
    try {
      const { downloadId } = await modelsApi.download(id);
      setActiveDownloads((prev) => ({ ...prev, [id]: downloadId }));
      toast.success(`${id} → ${t("common.download")}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setDownloading(null);
    }
  };

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
          <ModelCard key={model.id}>
            <Card
              title={
                <ModelHeader>
                  <span>{model.name}</span>
                  {model.isDefault && <Badge tone="accent">{t("profiles.defaultBadge")}</Badge>}
                  {model.installed ? (
                    <Badge tone="success">{t("models.installed")}</Badge>
                  ) : (
                    <Badge tone="neutral">{t("models.notInstalled")}</Badge>
                  )}
                </ModelHeader>
              }
              subtitle={model.description}
              headerAction={
                model.installed ? (
                  <Button
                    variant="success"
                    disabled
                    leftIcon={<Check size={16} />}
                  >
                    {t("models.installedButton")}
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    leftIcon={<Download size={16} />}
                    isLoading={downloading === model.id}
                    onClick={() => void handleDownload(model.id)}
                  >
                    {t("models.download")}
                  </Button>
                )
              }
            >
              <ModelMeta>
                <span>{t("models.sizeMb", { size: model.sizeMb })}</span>
                <code>{model.destinationPath}</code>
              </ModelMeta>
              {activeDownloads[model.id] && (
                <div style={{ marginTop: 12 }}>
                  <ModelDownloadProgress
                    downloadId={activeDownloads[model.id]!}
                    label={model.name}
                    onComplete={handleDownloadComplete}
                  />
                </div>
              )}
            </Card>
          </ModelCard>
        ))
      )}
    </PageRoot>
  );
};

export default Models;

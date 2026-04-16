import { FC, useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { Download, HardDrive } from "lucide-react";

import Badge from "../../components/Badge";
import Button from "../../components/Button";
import Card from "../../components/Card";
import EmptyState from "../../components/EmptyState";
import { api } from "../../api/MozgoslavApi";
import { ModelEntry } from "../../models/Model";
import { PageRoot, PageTitle, Subtitle, ModelCard, ModelMeta, ModelHeader } from "./Models.style";

const Models: FC = () => {
  const { t } = useTranslation();
  const [models, setModels] = useState<ModelEntry[]>([]);
  const [downloading, setDownloading] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setModels(await api.listModels());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleDownload = async (id: string) => {
    setDownloading(id);
    try {
      await api.downloadModel(id);
      toast.success(`${id} → ${t("common.download")}`);
      await refresh();
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
                <Button
                  variant={model.installed ? "secondary" : "primary"}
                  leftIcon={<Download size={16} />}
                  isLoading={downloading === model.id}
                  onClick={() => void handleDownload(model.id)}
                >
                  {t("models.download")}
                </Button>
              }
            >
              <ModelMeta>
                <span>{t("models.sizeMb", { size: model.sizeMb })}</span>
                <code>{model.destinationPath}</code>
              </ModelMeta>
            </Card>
          </ModelCard>
        ))
      )}
    </PageRoot>
  );
};

export default Models;

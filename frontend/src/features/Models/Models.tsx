import { FC, useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { ExternalLink, HardDrive } from "lucide-react";

import Badge from "../../components/Badge";
import Button from "../../components/Button";
import Card from "../../components/Card";
import EmptyState from "../../components/EmptyState";
import { api } from "../../api/MozgoslavApi";
import { ModelEntry } from "../../models/Model";
import { PageRoot, PageTitle, Subtitle, ModelCard, ModelMeta, ModelHeader } from "./Models.style";

/**
 * ADR-006 D-11: the Models page is **read-only**. LM Studio owns the download
 * UX; we surface what already lives under AppPaths.Models and redirect users
 * there for everything else.
 */
const Models: FC = () => {
  const { t } = useTranslation();
  const [models, setModels] = useState<ModelEntry[]>([]);

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

  const openLmStudio = () => {
    const url = "lmstudio://";
    if (window.mozgoslav?.openPath) {
      void window.mozgoslav.openPath(url);
    } else {
      window.open(url, "_blank");
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
                  <Badge tone={model.installed ? "success" : "neutral"}>
                    {t(model.installed ? "models.installed" : "models.notInstalled")}
                  </Badge>
                </ModelHeader>
              }
              subtitle={model.description}
            >
              <ModelMeta>
                <code>{model.destinationPath}</code>
              </ModelMeta>
            </Card>
          </ModelCard>
        ))
      )}
      <Button variant="ghost" rightIcon={<ExternalLink size={14} />} onClick={openLmStudio}>
        {t("models.openInLmStudioHint")}
      </Button>
    </PageRoot>
  );
};

export default Models;

import { FC, useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Archive } from "lucide-react";
import { toast } from "react-toastify";

import Button from "../../components/Button";
import Card from "../../components/Card";
import EmptyState from "../../components/EmptyState";
import type { BackupFile } from "../../api";
import { apiFactory } from "../../api";
import { BackupMeta, BackupName, BackupRow, PageRoot, PageTitle, Toolbar } from "./Backups.style";

const backupApi = apiFactory.createBackupApi();

const Backups: FC = () => {
  const { t } = useTranslation();
  const [items, setItems] = useState<BackupFile[]>([]);
  const [creating, setCreating] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const list = await backupApi.list();
      setItems(list);
    } catch {
      setItems([]);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const onCreate = async () => {
    setCreating(true);
    try {
      await backupApi.create();
      toast.success(t("backup.successToast"));
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setCreating(false);
    }
  };

  const openInFinder = (path: string) => {
    if (window.mozgoslav) {
      void window.mozgoslav.openPath(path);
    }
  };

  return (
    <PageRoot>
      <Toolbar>
        <PageTitle>{t("backup.title")}</PageTitle>
        <Button
          variant="primary"
          onClick={onCreate}
          isLoading={creating}
          leftIcon={<Archive size={16} />}
        >
          {t("backup.create")}
        </Button>
      </Toolbar>

      {items.length === 0 ? (
        <EmptyState title={t("backup.empty")} icon={<Archive size={28} />} />
      ) : (
        <Card>
          {items.map((item) => (
            <BackupRow key={item.path}>
              <div>
                <BackupName onClick={() => openInFinder(item.path)}>{item.name}</BackupName>
                <BackupMeta>
                  {(item.sizeBytes / 1024 / 1024).toFixed(1)} MB ·{" "}
                  {new Date(item.createdAt).toLocaleString()}
                </BackupMeta>
              </div>
            </BackupRow>
          ))}
        </Card>
      )}
    </PageRoot>
  );
};

export default Backups;

import { FC, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Archive } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import type { Action, Dispatch } from "redux";

import Button from "../../components/Button";
import Card from "../../components/Card";
import EmptyState from "../../components/EmptyState";
import {
  loadBackups,
  createBackup,
  selectAllBackups,
  selectBackupsCreating,
} from "../../store/slices/backups";
import { BackupMeta, BackupName, BackupRow, PageRoot, PageTitle, Toolbar } from "./Backups.style";

const Backups: FC = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch<Dispatch<Action>>();
  const items = useSelector(selectAllBackups);
  const creating = useSelector(selectBackupsCreating);

  useEffect(() => {
    dispatch(loadBackups());
  }, [dispatch]);

  const onCreate = () => {
    dispatch(createBackup());
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

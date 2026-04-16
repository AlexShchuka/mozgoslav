import React, { FC, useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { RefreshCw } from "lucide-react";

import Button from "../../components/Button";
import Card from "../../components/Card";
import EmptyState from "../../components/EmptyState";
import { api } from "../../api/MozgoslavApi";
import { PageRoot, PageTitle, LogPre, Toolbar, FileName } from "./Logs.style";

const Logs: FC = () => {
  const { t } = useTranslation();
  const [lines, setLines] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string>("");

  const refresh = useCallback(async () => {
    try {
      const tail = await api.tailLog(undefined, 400);
      setLines(tail.lines ?? []);
      setFileName(tail.file ?? "");
    } catch {
      setLines([]);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <PageRoot>
      <Toolbar>
        <PageTitle>{t("logs.title")}</PageTitle>
        <Button variant="secondary" leftIcon={<RefreshCw size={16} />} onClick={refresh}>
          {t("logs.refresh")}
        </Button>
      </Toolbar>
      {lines.length === 0 ? (
        <EmptyState title={t("logs.empty")} />
      ) : (
        <Card title={<FileName>{fileName}</FileName>}>
          <LogPre>{lines.join("\n")}</LogPre>
        </Card>
      )}
    </PageRoot>
  );
};

export default Logs;
